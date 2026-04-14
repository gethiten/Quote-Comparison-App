param(
    [string]$EnvFile = ".\backend\.env",
    [string]$DatabaseUrl,
    [int]$Top = 10,
    [string]$Table
)

$ErrorActionPreference = 'Stop'

function Get-EnvValue {
    param(
        [string]$Path,
        [string]$Name
    )

    if (-not (Test-Path $Path)) {
        return $null
    }

    foreach ($line in Get-Content $Path) {
        if ($line -match "^$Name=(.*)$") {
            return $matches[1].Trim()
        }
    }

    return $null
}

function Get-PythonCommand {
    $candidates = @(
        ".\backend\.venv\Scripts\python.exe",
        ".\venv\Scripts\python.exe"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        return $python.Source
    }

    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py) {
        return "$($py.Source) -3"
    }

    return $null
}

if (-not $DatabaseUrl) {
    $DatabaseUrl = Get-EnvValue -Path $EnvFile -Name 'DATABASE_URL'
}

if (-not $DatabaseUrl) {
    throw "DATABASE_URL was not provided and could not be found in $EnvFile"
}

$pythonCommand = Get-PythonCommand
if (-not $pythonCommand) {
    throw "Python was not found. Install Python or activate the project environment first."
}

$tempPy = Join-Path $env:TEMP "view_all_tables_quotecompare.py"
$escapedTable = ($Table ?? '').Replace("'", "''")
$pythonCode = @"
import json
from sqlalchemy import create_engine, text

url = r'''$DatabaseUrl'''
selected_table = r'''$escapedTable'''.strip()
limit_rows = $Top
connect_args = {"connect_timeout": 15}
if "sslmode=" not in url.lower():
    connect_args["sslmode"] = "require"

last_error = None
for attempt in range(1, 4):
    try:
        engine = create_engine(
            url,
            future=True,
            pool_pre_ping=True,
            pool_recycle=300,
            connect_args=connect_args,
        )

        with engine.connect() as conn:
            table_rows = conn.execute(text("""
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public'
                  AND (:selected = '' OR tablename = :selected)
                ORDER BY tablename
            """), {"selected": selected_table}).fetchall()

            tables = [row[0] for row in table_rows]

            if not tables:
                print('No matching public tables found.')
            else:
                for table in tables:
                    print(f'\n=== TABLE: {table} ===')
                    count = conn.execute(text(f'SELECT COUNT(*) FROM public."{table}"')).scalar_one()
                    print(f'Row count: {count}')
                    if count == 0:
                        print('(no rows)')
                        continue

                    rows = conn.execute(text(f'SELECT * FROM public."{table}" LIMIT {limit_rows}')).mappings().all()
                    for idx, row in enumerate(rows, start=1):
                        safe_row = {k: (str(v) if v is not None else None) for k, v in row.items()}
                        print(f'-- Row {idx} --')
                        print(json.dumps(safe_row, indent=2))
        last_error = None
        break
    except Exception as exc:
        last_error = exc
        if attempt == 3:
            raise
        print(f'Temporary connection issue on attempt {attempt}; retrying...')

if last_error:
    raise last_error
"@

Set-Content -Path $tempPy -Value $pythonCode -Encoding UTF8

try {
    if ($pythonCommand -like '* -3') {
        & py -3 $tempPy
    } else {
        & $pythonCommand $tempPy
    }
} catch {
    Write-Error "Failed to query the database. Verify the Azure PostgreSQL server is reachable and try again."
    throw
} finally {
    Remove-Item $tempPy -Force -ErrorAction SilentlyContinue
}
