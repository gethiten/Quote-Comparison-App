# Quote Comparison App — Short Deployment Checklist

Use this checklist for a quick and repeatable deployment.

---

## 1) Prerequisites

- [ ] Azure subscription access confirmed
- [ ] Azure CLI installed and logged in
- [ ] Azure Functions Core Tools v4 installed
- [ ] Python 3.11/3.12 installed
- [ ] Node.js 20+ installed
- [ ] Repo cloned locally

---

## 2) Prepare config

- [ ] Copy `backend/.env.example` to `backend/.env`
- [ ] Set `DATABASE_URL`
- [ ] Set `AZURE_OPENAI_ENDPOINT`
- [ ] Set `AZURE_OPENAI_DEPLOYMENT`
- [ ] Set `AZURE_CONTENT_UNDERSTANDING_ENDPOINT`
- [ ] Set `AZURE_CONTENT_UNDERSTANDING_ANALYZER_ID=insuranceQuoteExtractor`
- [ ] Set `CORS_ORIGINS`

---

## 3) Provision Azure resources

Run:

```powershell
az login
az account set --subscription "<subscription>"
az group create --name rg-quote-comparison --location centralus

az deployment group create `
  --resource-group rg-quote-comparison `
  --template-file infra/main.bicep `
  --parameters @infra/main.parameters.json `
  --parameters dbAdminPassword="<strong-password>" `
               notificationEmail="you@example.com" `
               communicationSender="DoNotReply@your-domain.com"
```

Checklist:
- [ ] Resource group created
- [ ] Bicep deployment completed successfully
- [ ] Storage, PostgreSQL, AI, and Function App resources exist

---

## 4) Create Content Understanding analyzer

```powershell
cd func_app
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python setup_analyzer.py
```

- [ ] Analyzer created
- [ ] Analyzer status is ready
- [ ] Analyzer ID matches `insuranceQuoteExtractor`

---

## 5) Publish Azure Function App

```powershell
cd func_app
func azure functionapp publish quotecompare-func --build remote --python
```

- [ ] Publish succeeded
- [ ] Function App settings are present
- [ ] Blob-trigger processing is active

---

## 6) Local app smoke test

### Backend
```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend
```powershell
cd frontend
npm install
npm run dev
```

- [ ] `http://localhost:8000/api/health` returns OK
- [ ] `http://localhost:5173` loads the app
- [ ] Dashboard opens without API errors

---

## 7) Upload test

- [ ] Upload a sample PDF quote
- [ ] Upload a sample DOCX quote
- [ ] Upload a sample XLSX quote
- [ ] Records appear in PostgreSQL
- [ ] Extracted quote fields show in the UI

---

## 8) Optional hosted backend

- [ ] Set `enableBackendWebApp=true` in `infra/main.parameters.json` if a hosted API is needed
- [ ] Redeploy Bicep
- [ ] Deploy backend package to `quotecompare-api`

---

## 9) Demo cost check

- [ ] Prefer `gpt-4.1-mini` for demos
- [ ] Keep backend hosting disabled unless needed
- [ ] Use small PostgreSQL SKU (`Standard_B1ms`)

---

## 10) Final sign-off

- [ ] Infrastructure deployed
- [ ] Function App published
- [ ] Analyzer ready
- [ ] Local UI works
- [ ] Upload processing works end-to-end
- [ ] Demo environment is ready
