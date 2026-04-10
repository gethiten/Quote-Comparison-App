# Azure Infrastructure (Bicep)

This folder contains a starter Azure Bicep deployment for the Quote Comparison App.

## Resources provisioned

- Azure Storage account + `quote-documents` blob container
- Azure Database for PostgreSQL Flexible Server + `quote_comparison` database
- Azure AI Services account for Azure OpenAI / Content Understanding
- Azure Communication Services account
- Azure Communication Email Service + Azure-managed domain
- Linux App Service plan + Azure Function App
- Optional Linux App Service plan + FastAPI backend Web App
- Application Insights

## Files

- `main.bicep` - primary resource group deployment
- `main.parameters.json` - sample parameter values matching the current environment

## Current environment alignment

The template and parameter defaults now match the active Azure setup for:

- Storage: `quotecomparestr2026`
- PostgreSQL: `quotecompare-pgserver` + `quote_comparison`
- Function App: `quotecompare-func` on plan `quotecompare-plan`
- AI Services / Foundry: `quotecompare-cu` + project `quotecompare-project`
- Model deployments: `gpt-4.1`, `gpt-4.1-mini`, `text-embedding-3-large`
- Communication Services: `quotecompare-comm`
- Email Service / Domain: `quotecompare-email` + `AzureManagedDomain`

> Note: the custom Content Understanding analyzer `insuranceQuoteExtractor` is a **data-plane** object. It is verified and referenced by the template, but its lifecycle is typically managed via REST/API bootstrap rather than a first-class ARM/Bicep resource.

## Deploy

Create or select your resource group, then run:

```powershell
az group create --name rg-quote-comparison --location centralus

az deployment group create \
  --resource-group rg-quote-comparison \
  --template-file infra/main.bicep \
  --parameters @infra/main.parameters.json \
  --parameters dbAdminPassword="<strong-password>" \
               notificationEmail="you@example.com" \
               communicationSender="DoNotReply@your-domain.com"
```

## Notes

- Replace the placeholder values in `main.parameters.json` before deployment.
- The generated Bicep creates the Azure resources, but app code publishing is still a separate step.
- The template provisions the Azure resources and storage endpoints. Frontend and backend code publishing are still separate deployment steps.
- If you later want stricter network security, move PostgreSQL and the AI account behind private endpoints.
