"""AI agent for quote comparison analysis and recommendations.

Analyzes multiple quotes and provides broker-friendly recommendations using Azure OpenAI.
"""
import enum
import json
import logging
from decimal import Decimal

from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import AsyncAzureOpenAI

from app.config import settings

logger = logging.getLogger(__name__)


def _json_safe(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, enum.Enum):
        return value.value
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value


COMPARISON_SYSTEM_PROMPT = """You are an expert commercial property insurance broker advisor.
You will receive a JSON array of carrier quotes for a specific property.

Provide a concise analysis that includes:
1. **Summary**: Brief overview of all quotes received.
2. **Best Value**: Which quote offers the best price-to-coverage ratio and why.
3. **Best Coverage**: Which quote offers the broadest coverage protection and why.
4. **Coverage Gaps**: Critical gaps or concerns for each quote.
5. **Recommendation**: Your recommended quote with rationale.
6. **Negotiation Points**: Suggestions for negotiating better terms.

Keep the response professional and suitable for an internal broker team.
Use specific numbers and carrier names. Be direct and actionable.
"""


async def analyze_quotes(quotes_json: list[dict], property_info: dict) -> str | None:
    """Use Azure OpenAI to analyze and compare quotes, returning broker-friendly insights."""
    endpoint = settings.AZURE_OPENAI_ENDPOINT
    api_key = settings.AZURE_OPENAI_API_KEY
    deployment = settings.AZURE_OPENAI_DEPLOYMENT

    if not endpoint or not deployment:
        logger.info("Azure OpenAI not configured — skipping AI analysis.")
        return None

    client_kwargs = {
        "azure_endpoint": endpoint,
        "api_version": settings.AZURE_OPENAI_API_VERSION,
        "timeout": 60.0,
        "max_retries": 3,
    }

    if api_key and "your_" not in api_key:
        client_kwargs["api_key"] = api_key
    else:
        token_provider = get_bearer_token_provider(
            DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
        )
        client_kwargs["azure_ad_token_provider"] = token_provider

    client = AsyncAzureOpenAI(**client_kwargs)

    safe_property_info = _json_safe(property_info)
    safe_quotes_json = _json_safe(quotes_json)

    user_msg = (
        f"Property: {json.dumps(safe_property_info)}\n\n"
        f"Quotes to compare:\n{json.dumps(safe_quotes_json, indent=2)}"
    )

    try:
        response = await client.chat.completions.create(
            model=deployment,
            messages=[
                {"role": "system", "content": COMPARISON_SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.3,
            max_tokens=3000,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error("AI comparison analysis failed: %s", e)
        return None
