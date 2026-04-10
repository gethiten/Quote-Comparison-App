"""Create the Content Understanding analyzer for insurance quote extraction.

Run once to register the custom analyzer with Azure AI Content Understanding.
Uses the current Azure CLI login for authentication.
"""

import json
import os
import subprocess
import sys

import requests

AI_ENDPOINT = "https://quotecompare-cu.cognitiveservices.azure.com"
ANALYZER_ID = "quote-field-extractor"
API_VERSION = "2025-11-01"


def get_token() -> str:
    """Get an Azure AD token via the Azure CLI."""
    # Check if token passed via environment (avoids subprocess path issues on Windows)
    env_token = os.environ.get("AZURE_TOKEN")
    if env_token:
        return env_token
    result = subprocess.run(
        "az account get-access-token --resource https://cognitiveservices.azure.com --query accessToken -o tsv",
        capture_output=True, text=True, check=True, shell=True,
    )
    return result.stdout.strip()


def create_analyzer(token: str):
    """Create (or replace) the Content Understanding analyzer."""
    url = f"{AI_ENDPOINT}/contentunderstanding/analyzers/{ANALYZER_ID}?api-version={API_VERSION}"

    analyzer_def = {
        "description": "Extracts structured fields from commercial property insurance quote documents",
        "scenario": "document",
        "config": {
            "returnDetails": True,
            "enableOcr": True,
            "enableLayout": True,
            "estimateFieldSourceAndConfidence": True,
        },
        "fieldSchema": {
            "name": "InsuranceQuoteAnalysis",
            "fields": {
                "CarrierName": {
                    "type": "string",
                    "method": "extract",
                    "description": "Insurance carrier or underwriter company name (e.g. Travelers, Zurich, Hartford, AIG, Chubb, CNA)"
                },
                "QuoteNumber": {
                    "type": "string",
                    "method": "extract",
                    "description": "Quote reference number or policy number"
                },
                "QuoteDate": {
                    "type": "date",
                    "method": "extract",
                    "description": "Date the quote was issued"
                },
                "EffectiveDate": {
                    "type": "date",
                    "method": "extract",
                    "description": "Policy effective or inception date"
                },
                "ExpiryDate": {
                    "type": "date",
                    "method": "extract",
                    "description": "Policy expiration date"
                },
                "BuildingLimit": {
                    "type": "number",
                    "method": "extract",
                    "description": "Building coverage limit amount in USD"
                },
                "ValuationBasis": {
                    "type": "string",
                    "method": "extract",
                    "description": "Valuation basis: Replacement Cost (RC) or Actual Cash Value (ACV)"
                },
                "CoverageForm": {
                    "type": "string",
                    "method": "extract",
                    "description": "Coverage form type: Special, Broad, or Basic"
                },
                "Coinsurance": {
                    "type": "integer",
                    "method": "extract",
                    "description": "Coinsurance percentage (e.g. 80, 90, 100)"
                },
                "BPPLimit": {
                    "type": "number",
                    "method": "extract",
                    "description": "Business Personal Property (contents) coverage limit in USD"
                },
                "BusinessInterruptionLimit": {
                    "type": "number",
                    "method": "extract",
                    "description": "Business interruption or business income coverage limit in USD"
                },
                "BIPeriodMonths": {
                    "type": "integer",
                    "method": "extract",
                    "description": "Business interruption indemnity or restoration period in months"
                },
                "GLPerOccurrence": {
                    "type": "number",
                    "method": "extract",
                    "description": "General liability per-occurrence limit in USD"
                },
                "GLAggregate": {
                    "type": "number",
                    "method": "extract",
                    "description": "General liability aggregate limit in USD"
                },
                "AOPDeductible": {
                    "type": "number",
                    "method": "extract",
                    "description": "All Other Perils (AOP) deductible amount in USD"
                },
                "WindHailDeductiblePct": {
                    "type": "number",
                    "method": "extract",
                    "description": "Wind/Hail or Named Storm deductible as a percentage of insured value"
                },
                "FloodLimit": {
                    "type": "number",
                    "method": "extract",
                    "description": "Flood coverage limit in USD"
                },
                "EarthquakeLimit": {
                    "type": "number",
                    "method": "extract",
                    "description": "Earthquake coverage limit in USD"
                },
                "EquipmentBreakdown": {
                    "type": "boolean",
                    "method": "extract",
                    "description": "Whether equipment breakdown or boiler and machinery coverage is included"
                },
                "OrdinanceOrLaw": {
                    "type": "boolean",
                    "method": "extract",
                    "description": "Whether ordinance or law or building code coverage is included"
                },
                "AnnualPremium": {
                    "type": "number",
                    "method": "extract",
                    "description": "Total annual premium amount in USD"
                },
                "UnderwritingNotes": {
                    "type": "string",
                    "method": "generate",
                    "description": "Any underwriting notes, conditions, exclusions, or remarks"
                }
            }
        }
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    print(f"Creating analyzer '{ANALYZER_ID}'...")
    resp = requests.put(url, headers=headers, json=analyzer_def, timeout=60)

    if resp.status_code in (200, 201):
        print(f"Analyzer created successfully (HTTP {resp.status_code})")
        print(json.dumps(resp.json(), indent=2))
    else:
        print(f"ERROR: HTTP {resp.status_code}")
        print(resp.text)
        sys.exit(1)


def verify_analyzer(token: str):
    """Verify the analyzer exists."""
    url = f"{AI_ENDPOINT}/contentunderstanding/analyzers/{ANALYZER_ID}?api-version={API_VERSION}"
    headers = {"Authorization": f"Bearer {token}"}

    resp = requests.get(url, headers=headers, timeout=30)
    if resp.status_code == 200:
        data = resp.json()
        fields = data.get("fieldSchema", {}).get("fields", {})
        print(f"\nAnalyzer '{ANALYZER_ID}' verified — {len(fields)} fields defined")
        for name in fields:
            print(f"  - {name}")
    else:
        print(f"Verify failed: HTTP {resp.status_code} — {resp.text}")


if __name__ == "__main__":
    token = get_token()
    create_analyzer(token)
    verify_analyzer(token)
