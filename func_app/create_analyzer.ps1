# Create Content Understanding custom analyzer via PowerShell
$token = (az account get-access-token --resource https://cognitiveservices.azure.com --query accessToken -o tsv)

$endpoint = "https://quotecompare-cu.cognitiveservices.azure.com"
$analyzerId = "quote-field-extractor"
$apiVersion = "2025-11-01"
$url = "$endpoint/contentunderstanding/analyzers/${analyzerId}?api-version=$apiVersion"

$body = @{
    description = "Extracts structured fields from commercial property insurance quote documents"
    scenario = "document"
    config = @{
        returnDetails = $true
        enableOcr = $true
        enableLayout = $true
        estimateFieldSourceAndConfidence = $true
    }
    fieldSchema = @{
        name = "InsuranceQuoteAnalysis"
        fields = @{
            CarrierName = @{ type = "string"; method = "extract"; description = "Insurance carrier or underwriter company name" }
            QuoteNumber = @{ type = "string"; method = "extract"; description = "Quote reference number or policy number" }
            QuoteDate = @{ type = "date"; method = "extract"; description = "Date the quote was issued" }
            EffectiveDate = @{ type = "date"; method = "extract"; description = "Policy effective or inception date" }
            ExpiryDate = @{ type = "date"; method = "extract"; description = "Policy expiration date" }
            BuildingLimit = @{ type = "number"; method = "extract"; description = "Building coverage limit amount in USD" }
            ValuationBasis = @{ type = "string"; method = "extract"; description = "Valuation basis: Replacement Cost (RC) or Actual Cash Value (ACV)" }
            CoverageForm = @{ type = "string"; method = "extract"; description = "Coverage form type: Special, Broad, or Basic" }
            Coinsurance = @{ type = "integer"; method = "extract"; description = "Coinsurance percentage such as 80, 90, or 100" }
            BPPLimit = @{ type = "number"; method = "extract"; description = "Business Personal Property contents coverage limit in USD" }
            BusinessInterruptionLimit = @{ type = "number"; method = "extract"; description = "Business interruption or business income coverage limit in USD" }
            BIPeriodMonths = @{ type = "integer"; method = "extract"; description = "Business interruption indemnity or restoration period in months" }
            GLPerOccurrence = @{ type = "number"; method = "extract"; description = "General liability per-occurrence limit in USD" }
            GLAggregate = @{ type = "number"; method = "extract"; description = "General liability aggregate limit in USD" }
            AOPDeductible = @{ type = "number"; method = "extract"; description = "All Other Perils AOP deductible amount in USD" }
            WindHailDeductiblePct = @{ type = "number"; method = "extract"; description = "Wind Hail or Named Storm deductible as a percentage of insured value" }
            FloodLimit = @{ type = "number"; method = "extract"; description = "Flood coverage limit in USD" }
            EarthquakeLimit = @{ type = "number"; method = "extract"; description = "Earthquake coverage limit in USD" }
            EquipmentBreakdown = @{ type = "boolean"; method = "extract"; description = "Whether equipment breakdown or boiler and machinery coverage is included" }
            OrdinanceOrLaw = @{ type = "boolean"; method = "extract"; description = "Whether ordinance or law or building code coverage is included" }
            AnnualPremium = @{ type = "number"; method = "extract"; description = "Total annual premium amount in USD" }
            UnderwritingNotes = @{ type = "string"; method = "generate"; description = "Any underwriting notes, conditions, exclusions, or remarks" }
        }
    }
} | ConvertTo-Json -Depth 5

$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "Creating analyzer '$analyzerId'..."
try {
    $resp = Invoke-WebRequest -Uri $url -Method Put -Headers $headers -Body $body -UseBasicParsing -TimeoutSec 120
    Write-Host "SUCCESS: HTTP $($resp.StatusCode)"
    Write-Host $resp.Content
} catch {
    $err = $_.Exception.Response
    if ($err) {
        $reader = [System.IO.StreamReader]::new($err.GetResponseStream())
        $errBody = $reader.ReadToEnd()
        Write-Host "ERROR: HTTP $($err.StatusCode)"
        Write-Host $errBody
    } else {
        Write-Host "ERROR: $_"
    }
}

# Verify
Write-Host "`nVerifying analyzer..."
try {
    $resp2 = Invoke-WebRequest -Uri $url -Method Get -Headers @{Authorization="Bearer $token"} -UseBasicParsing
    $data = $resp2.Content | ConvertFrom-Json
    Write-Host "Analyzer '$analyzerId' verified - Status: $($data.status)"
    $fieldNames = ($data.fieldSchema.fields | Get-Member -MemberType NoteProperty).Name
    Write-Host "Fields ($($fieldNames.Count)): $($fieldNames -join ', ')"
} catch {
    Write-Host "Verify failed: $_"
}
