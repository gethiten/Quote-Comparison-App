"""Scoring and gap detection service — mirrors frontend logic."""
from app.schemas.schemas import GapFlag, QuoteOut, ScoredQuote


def detect_gaps(quote: QuoteOut) -> list[GapFlag]:
    """Run auto-flag rules (MVP) against a single quote."""
    gaps: list[GapFlag] = []

    # 1. ACV valuation
    if quote.valuation_basis == "ACV":
        gaps.append(GapFlag(
            severity="error",
            attribute="Valuation",
            message="Actual Cash Value — loss settlement reduced by depreciation. Replacement Cost recommended.",
        ))

    # 2. Non-Special coverage form
    if quote.coverage_form and quote.coverage_form != "Special":
        gaps.append(GapFlag(
            severity="warning",
            attribute="Coverage Form",
            message=f"{quote.coverage_form} form provides narrower coverage than Special form.",
        ))

    # 3. Flood excluded
    if quote.flood_limit is None or quote.flood_limit == 0:
        gaps.append(GapFlag(
            severity="error",
            attribute="Flood",
            message="Flood coverage excluded. NFIP policy strongly recommended.",
        ))

    # 4. Flood sublimit low (< 5% of building limit)
    if (
        quote.flood_limit
        and quote.building_limit
        and quote.flood_limit < quote.building_limit * 0.05
    ):
        gaps.append(GapFlag(
            severity="warning",
            attribute="Flood Sublimit",
            message="Flood sublimit is below 5% of building value.",
        ))

    # 5. BI limit < 10% of building limit
    if (
        quote.business_interruption_limit
        and quote.building_limit
        and quote.business_interruption_limit < quote.building_limit * 0.10
    ):
        gaps.append(GapFlag(
            severity="warning",
            attribute="Business Interruption",
            message="BI limit is below 10% of building value — may be inadequate.",
        ))

    # 6. Coinsurance < 80%
    if quote.coinsurance and quote.coinsurance < 80:
        gaps.append(GapFlag(
            severity="warning",
            attribute="Coinsurance",
            message=f"Coinsurance at {quote.coinsurance}% — below 80% threshold.",
        ))

    # 7. Wind/Hail > 3%
    if quote.wind_hail_deductible_pct and quote.wind_hail_deductible_pct > 3:
        gaps.append(GapFlag(
            severity="warning",
            attribute="Wind/Hail",
            message=f"Wind/Hail deductible at {quote.wind_hail_deductible_pct}% — above 3% market norm.",
        ))

    # 8. Equipment breakdown excluded
    if quote.equipment_breakdown is False:
        gaps.append(GapFlag(
            severity="warning",
            attribute="Equipment Breakdown",
            message="Equipment Breakdown coverage excluded.",
        ))

    # 9. Quote expires < 7 days (simplified — would need current date comparison)
    # Handled on the frontend with actual date math

    # 10. Carrier rating below A- (need carrier info)
    if quote.carrier and quote.carrier.am_best_rating:
        rating = quote.carrier.am_best_rating
        low_ratings = {"B++", "B+", "B", "B-", "C++", "C+", "C", "C-"}
        if rating in low_ratings:
            gaps.append(GapFlag(
                severity="warning",
                attribute="Carrier Rating",
                message=f"AM Best rating {rating} is below A- threshold.",
            ))

    return gaps


def score_single(quote: QuoteOut, all_quotes: list[QuoteOut], weights: dict) -> ScoredQuote:
    """Score a single quote relative to peers."""
    gaps = detect_gaps(quote)

    # Premium score (lower is better)
    premiums = [q.annual_premium for q in all_quotes if q.annual_premium]
    if premiums and quote.annual_premium:
        min_p, max_p = min(premiums), max(premiums)
        premium_score = 100 * (1 - (quote.annual_premium - min_p) / (max_p - min_p)) if max_p > min_p else 100
    else:
        premium_score = 50

    # Coverage breadth
    cov_score = 50.0
    if quote.flood_limit and quote.flood_limit > 0:
        cov_score += 10
    if quote.equipment_breakdown:
        cov_score += 10
    if quote.bi_period_months and quote.bi_period_months >= 12:
        cov_score += 10
    if quote.valuation_basis == "RC":
        cov_score += 10
    if quote.coverage_form == "Special":
        cov_score += 10
    cov_score = min(cov_score, 100)

    # Carrier rating
    rating_map = {"A++": 100, "A+": 95, "A": 85, "A-": 75, "B++": 60, "B+": 50, "B": 40}
    carrier_score = 50.0
    if quote.carrier and quote.carrier.am_best_rating:
        carrier_score = rating_map.get(quote.carrier.am_best_rating, 50)

    # Deductibles (lower is better)
    deductibles = [q.aop_deductible for q in all_quotes if q.aop_deductible]
    if deductibles and quote.aop_deductible:
        min_d, max_d = min(deductibles), max(deductibles)
        ded_score = 100 * (1 - (quote.aop_deductible - min_d) / (max_d - min_d)) if max_d > min_d else 100
    else:
        ded_score = 50

    # Weighted total
    w_p = weights.get("premium", 35) / 100
    w_c = weights.get("coverageBreadth", 30) / 100
    w_r = weights.get("carrierRating", 20) / 100
    w_d = weights.get("deductibles", 15) / 100

    total = premium_score * w_p + cov_score * w_c + carrier_score * w_r + ded_score * w_d

    # Gap penalty
    for g in gaps:
        total -= 5 if g.severity == "error" else 2

    total = max(0, min(100, total))

    return ScoredQuote(
        quote=quote,
        total_score=round(total, 1),
        breakdown={
            "premium": round(premium_score, 1),
            "coverageBreadth": round(cov_score, 1),
            "carrierRating": round(carrier_score, 1),
            "deductibles": round(ded_score, 1),
        },
        gaps=gaps,
    )


def rank_quotes(quotes: list, weights: dict) -> list[ScoredQuote]:
    """Score and rank all quotes in a comparison."""
    quote_outs = [QuoteOut.model_validate(q) for q in quotes] if quotes else []
    scored = [score_single(q, quote_outs, weights) for q in quote_outs]
    scored.sort(key=lambda s: s.total_score, reverse=True)
    return scored
