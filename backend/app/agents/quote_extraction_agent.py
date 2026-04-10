"""AI-powered quote extraction agent using Azure OpenAI.

Reads raw text extracted from carrier quote documents (PDF, DOCX, XLSX) and
returns structured QuoteBase data using GPT-4o with a strict JSON schema.
"""
import json
import logging

from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import AsyncAzureOpenAI

from app.config import settings
from app.schemas.schemas import QuoteBase

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert commercial property insurance quote parser.
You will receive raw text extracted from a carrier quote document (PDF, Word, or Excel).

Your job is to extract ALL available structured data and return it as JSON with exactly these fields:

{
  "carrier_name": "string or null",
  "quote_number": "string or null",
  "quote_date": "YYYY-MM-DD or null",
  "effective_date": "YYYY-MM-DD or null",
  "expiry_date": "YYYY-MM-DD or null",
  "building_limit": number or null,
  "valuation_basis": "RC" or "ACV" or null,
  "coverage_form": "Special" or "Broad" or "Basic" or null,
  "coinsurance": integer or null (e.g. 80, 90),
  "bpp_limit": number or null,
  "business_interruption_limit": number or null,
  "bi_period_months": integer or null,
  "gl_per_occurrence": number or null,
  "gl_aggregate": number or null,
  "aop_deductible": number or null,
  "wind_hail_deductible_pct": number or null (e.g. 2 for 2%),
  "flood_limit": number or null (null if excluded),
  "earthquake_limit": number or null (null if excluded),
  "equipment_breakdown": boolean or null,
  "ordinance_or_law": boolean or null,
  "annual_premium": number or null,
  "underwriting_notes": "string summarizing key UW notes, conditions, or exclusions" or null
}

Rules:
- Return ONLY valid JSON, no markdown fences, no explanation.
- Use null for any field you cannot find in the document.
- `carrier_name` should be the insurer/carrier shown on the quote (for example `AIG`, `Travelers`, `The Hartford`).
- For monetary values, return raw numbers (no $ or commas). E.g. 42800 not "$42,800".
- valuation_basis must be exactly "RC" (Replacement Cost) or "ACV" (Actual Cash Value).
- coverage_form must be exactly "Special", "Broad", or "Basic".
- If flood or earthquake is "excluded" or "not included", set the limit to null.
- wind_hail_deductible_pct should be the percentage number (e.g. 2 for "2% TIV").
- Combine all important underwriting notes, exclusions, and conditions into underwriting_notes.
"""


async def extract_quote_with_ai(document_text: str, filename: str) -> QuoteBase | None:
    """Use Azure OpenAI to extract structured quote data from document text."""
    endpoint = settings.AZURE_OPENAI_ENDPOINT
    deployment = settings.AZURE_OPENAI_DEPLOYMENT

    if not endpoint:
        logger.info("Azure OpenAI endpoint not configured — skipping AI extraction.")
        return None

    # Use DefaultAzureCredential (works with managed identity, az login, etc.)
    token_provider = get_bearer_token_provider(
        DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
    )

    client = AsyncAzureOpenAI(
        azure_endpoint=endpoint,
        azure_ad_token_provider=token_provider,
        api_version=settings.AZURE_OPENAI_API_VERSION,
        timeout=60.0,
        max_retries=3,
    )

    # Truncate very long documents to avoid token limits
    max_chars = 15000
    truncated = document_text[:max_chars] if len(document_text) > max_chars else document_text

    try:
        response = await client.chat.completions.create(
            model=deployment,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Extract quote data from this {filename} document:\n\n{truncated}",
                },
            ],
            temperature=0,
            max_tokens=2000,
        )

        content = response.choices[0].message.content.strip()
        # Strip markdown fences if present
        if content.startswith("```"):
            content = content.split("\n", 1)[1]
            if content.endswith("```"):
                content = content[: content.rfind("```")]

        data = json.loads(content)
        return QuoteBase(**data)

    except Exception as e:
        logger.error("AI extraction failed for %s: %s", filename, e)
        return None
