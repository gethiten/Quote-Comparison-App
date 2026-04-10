"""Run azure_schema.sql against Azure PostgreSQL."""
import psycopg2

conn = psycopg2.connect(
    host="quotecompare-pgserver.postgres.database.azure.com",
    database="quote_comparison",
    user="quoteadmin",
    password="QuoteApp2026!",
    sslmode="require",
)
conn.autocommit = True
cur = conn.cursor()

with open("azure_schema.sql", "r") as f:
    sql = f.read()

cur.execute(sql)
print("Schema created successfully!")

cur.execute(
    "SELECT table_name FROM information_schema.tables "
    "WHERE table_schema='public' ORDER BY table_name"
)
for row in cur.fetchall():
    print(f"  - {row[0]}")

cur.close()
conn.close()
