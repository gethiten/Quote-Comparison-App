param(
    [string]$EnvFile = ".\backend\.env",
    [string]$DatabaseUrl,
    [switch]$Force,
    [switch]$WhatIf
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

try {
    $dbUri = [System.Uri]$DatabaseUrl
    $dbHost = $dbUri.Host
    $dbName = $dbUri.AbsolutePath.TrimStart('/')
    Write-Host "Target database: $dbName on $dbHost" -ForegroundColor Yellow
} catch {
    Write-Host "Using provided DATABASE_URL" -ForegroundColor Yellow
}

Write-Host "This will delete all rows from all public tables except alembic_version." -ForegroundColor Red

if (-not $Force) {
    $confirmation = Read-Host "Type DELETE ALL to continue"
    if ($confirmation -ne 'DELETE ALL') {
        Write-Host "Cancelled." -ForegroundColor Yellow
        exit 1
    }
}

if ($WhatIf) {
    Write-Host "WhatIf: no data was deleted." -ForegroundColor Cyan
    exit 0
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
$sql = @"
DO $$
DECLARE
    tables text;
BEGIN
    SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
    INTO tables
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> 'alembic_version';

    IF tables IS NULL THEN
        RAISE NOTICE 'No public tables found to truncate.';
    ELSE
        EXECUTE 'TRUNCATE TABLE ' || tables || ' RESTART IDENTITY CASCADE';
    END IF;
END $$;
"@

if ($psql) {
    & $psql.Source $DatabaseUrl -v ON_ERROR_STOP=1 -c $sql
    Write-Host "All table rows deleted successfully." -ForegroundColor Green
    exit 0
}

$pythonCommand = Get-PythonCommand
if (-not $pythonCommand) {
    throw "Neither psql nor Python was found. Install one of them to run this script."
}

$tempPy = Join-Path $env:TEMP "truncate_all_tables_quotecompare.py"
$pythonCode = @"
from sqlalchemy import create_engine, text

url = r'''$DatabaseUrl'''
engine = create_engine(url, future=True)

with engine.begin() as conn:
    rows = conn.execute(text("""
        SELECT quote_ident(schemaname) || '.' || quote_ident(tablename)
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename <> 'alembic_version'
        ORDER BY tablename
    """)).fetchall()

    tables = [row[0] for row in rows]
    if not tables:
        print('No public tables found to truncate.')
    else:
        conn.execute(text('TRUNCATE TABLE ' + ', '.join(tables) + ' RESTART IDENTITY CASCADE'))
        print(f'Deleted all rows from {len(tables)} tables:')
        for table in tables:
            print(f' - {table}')
"@

Set-Content -Path $tempPy -Value $pythonCode -Encoding UTF8

try {
    if ($pythonCommand -like '* -3') {
        & py -3 $tempPy
    } else {
        & $pythonCommand $tempPy
    }
    Write-Host "All table rows deleted successfully." -ForegroundColor Green
} finally {
    Remove-Item $tempPy -Force -ErrorAction SilentlyContinue
}
