"""Check tables in Azure PostgreSQL."""
import psycopg2

conn = psycopg2.connect(
    host="quotecompare-pgserver.postgres.database.azure.com",
    database="quote_comparison",
    user="quoteadmin",
    password="QuoteApp2026!",
    sslmode="require",
)
cur = conn.cursor()

# List tables and column counts
cur.execute("""
    SELECT t.table_name,
           (SELECT count(*) FROM information_schema.columns c
            WHERE c.table_name = t.table_name AND c.table_schema = 'public')
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
    ORDER BY t.table_name
""")
print(f"{'Table':<25} {'Columns'}")
print("-" * 35)
for row in cur.fetchall():
    print(f"{row[0]:<25} {row[1]}")

# Show columns for each table
print()
for table in ["users", "accounts", "properties", "carriers", "quotes", "comparisons", "comparison_quotes", "audit_logs"]:
    cur.execute(f"""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = '{table}' AND table_schema = 'public'
        ORDER BY ordinal_position
    """)
    cols = cur.fetchall()
    if cols:
        print(f"\n=== {table} ===")
        for c in cols:
            print(f"  {c[0]:<35} {c[1]:<20} {'NULL' if c[2]=='YES' else 'NOT NULL'}")

cur.close()
conn.close()
