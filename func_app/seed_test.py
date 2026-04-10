import psycopg2

conn = psycopg2.connect(
    host="quotecompare-pgserver.postgres.database.azure.com",
    database="quote_comparison",
    user="quoteadmin",
    password="QuoteApp2026!",
    sslmode="require",
)
cur = conn.cursor()
cur.execute("SELECT q.quote_number, q.building_limit, q.annual_premium, q.coverage_form, q.valuation_basis, c.carrier_name FROM quotes q JOIN carriers c ON q.carrier_id = c.carrier_id ORDER BY q.created_at DESC LIMIT 5")
for row in cur.fetchall():
    print(row)
conn.close()
