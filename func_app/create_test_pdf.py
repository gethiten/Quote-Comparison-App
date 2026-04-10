"""Create a sample insurance quote PDF for testing."""
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

def create_test_quote():
    c = canvas.Canvas("test_quote_travelers.pdf", pagesize=letter)
    w, h = letter

    # Header
    c.setFont("Helvetica-Bold", 18)
    c.drawString(1*inch, h - 1*inch, "TRAVELERS INSURANCE")
    c.setFont("Helvetica", 12)
    c.drawString(1*inch, h - 1.3*inch, "Commercial Property Quote")

    # Quote details
    y = h - 2*inch
    fields = [
        ("Quote Number:", "TRV-2026-001234"),
        ("Quote Date:", "04/01/2026"),
        ("Effective Date:", "05/01/2026"),
        ("Expiry Date:", "05/01/2027"),
        ("", ""),
        ("PROPERTY COVERAGE", ""),
        ("Building Limit:", "$5,000,000"),
        ("Valuation Basis:", "Replacement Cost"),
        ("Coverage Form:", "Special"),
        ("Coinsurance:", "80%"),
        ("", ""),
        ("BUSINESS PERSONAL PROPERTY", ""),
        ("BPP Limit:", "$1,500,000"),
        ("Business Interruption Limit:", "$2,000,000"),
        ("BI Period:", "12 months"),
        ("", ""),
        ("GENERAL LIABILITY", ""),
        ("Per Occurrence:", "$1,000,000"),
        ("General Aggregate:", "$2,000,000"),
        ("", ""),
        ("DEDUCTIBLES", ""),
        ("AOP Deductible:", "$5,000"),
        ("Wind/Hail Deductible:", "2%"),
        ("", ""),
        ("ADDITIONAL COVERAGE", ""),
        ("Flood Limit:", "$500,000"),
        ("Earthquake Limit:", "$250,000"),
        ("Equipment Breakdown:", "Included"),
        ("Ordinance or Law:", "Included"),
        ("", ""),
        ("PREMIUM", ""),
        ("Annual Premium:", "$47,500"),
        ("", ""),
        ("Underwriting Notes:", "Subject to favorable loss control inspection."),
    ]

    c.setFont("Helvetica", 10)
    for label, value in fields:
        if not label and not value:
            y -= 10
            continue
        if not value:
            c.setFont("Helvetica-Bold", 11)
            c.drawString(1*inch, y, label)
            c.setFont("Helvetica", 10)
        else:
            c.drawString(1*inch, y, label)
            c.drawString(3.5*inch, y, value)
        y -= 16

    c.save()
    print("Created test_quote_travelers.pdf")

if __name__ == "__main__":
    create_test_quote()
