"""Create a custom Content Understanding analyzer using the Python SDK."""
from azure.identity import AzureCliCredential
from azure.ai.contentunderstanding import ContentUnderstandingClient
from azure.ai.contentunderstanding.models import (
    ContentAnalyzer,
    ContentAnalyzerConfig,
    ContentFieldSchema,
    ContentFieldDefinition,
    SupportedModels,
)

ENDPOINT = "https://quotecompare-cu.cognitiveservices.azure.com"
ANALYZER_ID = "quoteFieldExtractor"

credential = AzureCliCredential()
client = ContentUnderstandingClient(endpoint=ENDPOINT, credential=credential)

# List existing custom analyzers
print("Existing custom analyzers:")
for a in client.list_analyzers():
    if not a.analyzer_id.startswith("prebuilt-"):
        print(f"  {a.analyzer_id} - {a.status}")

# Define fields
fields = {
    "CarrierName": ContentFieldDefinition(type="string", method="extract", description="Insurance carrier or underwriter company name"),
    "QuoteNumber": ContentFieldDefinition(type="string", method="extract", description="Quote reference number or policy number"),
    "QuoteDate": ContentFieldDefinition(type="date", method="extract", description="Date the quote was issued"),
    "EffectiveDate": ContentFieldDefinition(type="date", method="extract", description="Policy effective or inception date"),
    "ExpiryDate": ContentFieldDefinition(type="date", method="extract", description="Policy expiration date"),
    "BuildingLimit": ContentFieldDefinition(type="number", method="extract", description="Building coverage limit amount in USD"),
    "ValuationBasis": ContentFieldDefinition(type="string", method="extract", description="Valuation basis RC or ACV"),
    "CoverageForm": ContentFieldDefinition(type="string", method="extract", description="Coverage form type Special Broad or Basic"),
    "Coinsurance": ContentFieldDefinition(type="integer", method="extract", description="Coinsurance percentage"),
    "BPPLimit": ContentFieldDefinition(type="number", method="extract", description="Business Personal Property contents limit in USD"),
    "BusinessInterruptionLimit": ContentFieldDefinition(type="number", method="extract", description="Business interruption limit in USD"),
    "BIPeriodMonths": ContentFieldDefinition(type="integer", method="extract", description="BI period in months"),
    "GLPerOccurrence": ContentFieldDefinition(type="number", method="extract", description="GL per-occurrence limit in USD"),
    "GLAggregate": ContentFieldDefinition(type="number", method="extract", description="GL aggregate limit in USD"),
    "AOPDeductible": ContentFieldDefinition(type="number", method="extract", description="AOP deductible in USD"),
    "WindHailDeductiblePct": ContentFieldDefinition(type="number", method="extract", description="Wind Hail deductible percentage"),
    "FloodLimit": ContentFieldDefinition(type="number", method="extract", description="Flood limit in USD"),
    "EarthquakeLimit": ContentFieldDefinition(type="number", method="extract", description="Earthquake limit in USD"),
    "EquipmentBreakdown": ContentFieldDefinition(type="boolean", method="extract", description="Equipment breakdown included"),
    "OrdinanceOrLaw": ContentFieldDefinition(type="boolean", method="extract", description="Ordinance or law included"),
    "AnnualPremium": ContentFieldDefinition(type="number", method="extract", description="Total annual premium in USD"),
    "UnderwritingNotes": ContentFieldDefinition(type="string", method="generate", description="Underwriting notes or remarks"),
}

analyzer = ContentAnalyzer(
    description="Extracts structured fields from commercial property insurance quote documents",
    base_analyzer_id="prebuilt-document",
    config=ContentAnalyzerConfig(
        return_details=True,
        enable_ocr=True,
        enable_layout=True,
        estimate_field_source_and_confidence=True,
    ),
    field_schema=ContentFieldSchema(name="InsuranceQuoteAnalysis", fields=fields),
    models={"completion": "gpt-4.1-mini"},
)

print(f"\nCreating analyzer '{ANALYZER_ID}'...")
try:
    poller = client.begin_create_analyzer(ANALYZER_ID, analyzer)
    result = poller.result()
    print(f"Analyzer created! Status: {result.status}")
    print(f"Fields: {len(result.field_schema.fields)}")
    for name in result.field_schema.fields:
        print(f"  - {name}")
except Exception as e:
    print(f"Error: {e}")
