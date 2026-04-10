"""AI agent for quote comparison analysis and recommendations.

Analyzes multiple quotes and provides broker-friendly recommendations using Azure OpenAI.
"""
import json
import logging

from openai import AsyncAzureOpenAI

from app.config import settings

logger = logging.getLogger(__name__)

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

    if not endpoint or not api_key or "your_" in api_key:
        logger.info("Azure OpenAI not configured — skipping AI analysis.")
        return None

    client = AsyncAzureOpenAI(
        azure_endpoint=endpoint,
        api_key=api_key,
        api_version=settings.AZURE_OPENAI_API_VERSION,
    )

    user_msg = (
        f"Property: {json.dumps(property_info)}\n\n"
        f"Quotes to compare:\n{json.dumps(quotes_json, indent=2)}"
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
