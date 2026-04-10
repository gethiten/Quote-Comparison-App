# Quote Comparison App — Complete Setup & Deployment Guide

This guide walks through the **full setup**, **local development**, and **Azure deployment** for the Quote Comparison App so a new developer can get it running without surprises.

> **Best demo setup:** keep the React frontend and FastAPI backend local, and only use Azure for the database, storage, Function App, and AI services. This keeps cost low and setup simple.

For a shorter version, see [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md).

---

## 1) What this app includes

- **Frontend:** React + Vite + Tailwind (`frontend/`)
- **Backend API:** FastAPI + SQLAlchemy (`backend/`)
- **Async document processing:** Azure Function blob trigger (`func_app/`)
- **Database:** PostgreSQL
- **AI extraction:** Azure AI Services / Content Understanding + GPT model fallback
- **Infrastructure as Code:** Bicep (`infra/`)

---

## 2) Prerequisites

Install these before starting:

### Required tools

| Tool | Recommended Version | Notes |
|---|---:|---|
| Git | Latest | Source control |
| Python | `3.12` for backend, `3.11` also works for Function app | Required for API and scripts |
| Node.js | `20+` | Required for frontend |
| npm | Comes with Node | Frontend package manager |
| Azure CLI | Latest | Azure deployment |
| Azure Functions Core Tools | v4 | Function deployment |
| Docker Desktop | Optional | Easiest local full-stack run |

### Azure prerequisites

You need an Azure subscription with permission to create:

- Resource groups
- Storage accounts
- Azure Database for PostgreSQL Flexible Server
- Azure AI Services / Foundry resources
- Azure Communication Services
- Azure Function App / App Service plan

---

## 3) Clone the repo

```powershell
git clone <your-repo-url>
cd Quote-Comparison-App
```

If this repo is already downloaded, just open the folder in VS Code.

---

## 4) Choose your setup path

Use the path that fits your goal:

### Option A — Fastest local demo
Use `docker-compose.yml` to start:
- PostgreSQL
- FastAPI backend
- Frontend

### Option B — Local development
Run backend and frontend separately for easier debugging.

### Option C — Azure deployment
Provision cloud resources with Bicep and publish the Function App (and optionally the backend app).

---

## 5) Local demo with Docker (fastest path)

### Step 1: Create the backend environment file

```powershell
Copy-Item backend\.env.example backend\.env
```

Edit `backend/.env` and set at least:

```env
DATABASE_URL=postgresql://quoteapp:quoteapp_dev@localhost:5432/quote_comparison
AZURE_STORAGE_CONNECTION_STRING=<your-storage-connection-string>
AZURE_STORAGE_CONTAINER=quote-documents
AZURE_OPENAI_ENDPOINT=https://<your-ai-resource>.cognitiveservices.azure.com/
AZURE_OPENAI_API_KEY=<optional-if-using-key-auth>
AZURE_OPENAI_DEPLOYMENT=gpt-4.1-mini
AZURE_CONTENT_UNDERSTANDING_ENDPOINT=https://<your-ai-resource>.cognitiveservices.azure.com/
AZURE_CONTENT_UNDERSTANDING_ANALYZER_ID=insuranceQuoteExtractor
APP_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

> For a **demo**, `gpt-4.1-mini` is the cheaper default model choice.

### Step 2: Start the stack

```powershell
docker compose up --build
```

### Step 3: Open the app

- Frontend: `http://localhost:3000`
- Backend docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

### Step 4: Seed sample data (optional)

If you want demo comparison data:

```powershell
cd backend
python seed_data.py
```

---

## 6) Local development without Docker

This is the best option if you want to debug the API or UI in VS Code.

### Step 1: Set up the backend

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` with your actual values.

### Step 2: Choose your database

#### Option 1 — Local PostgreSQL

Use a local server or Docker and set:

```env
DATABASE_URL=postgresql://quoteapp:quoteapp_dev@localhost:5432/quote_comparison
```

#### Option 2 — Azure PostgreSQL

Set:

```env
DATABASE_URL=postgresql://<admin-user>:<password>@<server-name>.postgres.database.azure.com:5432/quote_comparison?sslmode=require
```

If connecting to Azure PostgreSQL from your laptop, add a firewall rule for your public IP:

```powershell
az postgres flexible-server firewall-rule create `
  --resource-group <resource-group> `
  --name <postgres-server-name> `
  --rule-name AllowLocalDev `
  --start-ip-address <your-public-ip> `
  --end-ip-address <your-public-ip>
```

### Step 3: Start the backend API

From the `backend/` folder:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

If you start from the repo root instead, use:

```powershell
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

### Step 4: Verify the backend

Open:

- `http://localhost:8000/api/health`
- `http://localhost:8000/docs`

Expected health response:

```json
{"status":"ok","version":"2.0.0"}
```

### Step 5: Seed sample data (optional)

```powershell
cd backend
python seed_data.py
```

### Step 6: Start the frontend

In a new terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open:

- `http://localhost:5173`

The Vite dev server proxies `/api` to `http://localhost:8000` automatically.

---

## 7) Backend environment variables reference

Use `backend/.env.example` as the base file.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AZURE_STORAGE_CONNECTION_STRING` | Optional for local API | Used for blob access |
| `AZURE_STORAGE_CONTAINER` | Yes | Usually `quote-documents` |
| `AZURE_OPENAI_ENDPOINT` | Yes for AI extraction | Azure AI endpoint |
| `AZURE_OPENAI_API_KEY` | Optional | Leave blank if using token-based auth where supported |
| `AZURE_OPENAI_DEPLOYMENT` | Yes | Example: `gpt-4.1` or `gpt-4.1-mini` |
| `AZURE_OPENAI_API_VERSION` | Yes | Default is `2025-01-01-preview` |
| `AZURE_CONTENT_UNDERSTANDING_ENDPOINT` | Yes | Same AI resource endpoint |
| `AZURE_CONTENT_UNDERSTANDING_ANALYZER_ID` | Yes | Must match the analyzer you created |
| `APP_ENV` | Yes | `development`, `test`, or `prod` |
| `CORS_ORIGINS` | Yes | Comma-separated allowed frontend URLs |

---

## 8) Azure deployment — recommended demo approach

For a demo environment, this is the recommended path:

- Use `infra/main.bicep` to provision Azure resources
- Publish the Function App to Azure
- Keep the backend local **or** optionally deploy it to App Service
- Keep the frontend local **or** deploy it later as a static site

This avoids unnecessary always-on hosting cost.

---

## 9) Deploy Azure infrastructure with Bicep

### Step 1: Sign in and choose the subscription

```powershell
az login
az account set --subscription "<subscription-name-or-id>"
```

### Step 2: Create the resource group

```powershell
az group create --name rg-quote-comparison --location centralus
```

### Step 3: Review `infra/main.parameters.json`

Confirm these values are correct for your environment:

- resource names
- email sender address
- notification email
- AI deployment names
- `enableBackendWebApp` (`false` is recommended for demo use)

### Step 4: Deploy the template

```powershell
az deployment group create `
  --resource-group rg-quote-comparison `
  --template-file infra/main.bicep `
  --parameters @infra/main.parameters.json `
  --parameters dbAdminPassword="<strong-password>" `
               notificationEmail="you@example.com" `
               communicationSender="DoNotReply@your-domain.com" `
               allowedClientIp="<your-public-ip>"
```

### Step 5: What gets created

The Bicep template provisions:

- Azure Storage account + `quote-documents` container
- Azure PostgreSQL Flexible Server + `quote_comparison` database
- Azure AI Services account for OpenAI and Content Understanding
- Azure AI Foundry project
- GPT and embedding model deployments
- Azure Communication Services + Email Service
- Linux Function App plan + Function App
- Optional Linux App Service plan + backend Web App

---

## 10) Create the Content Understanding analyzer

The app expects a custom analyzer for quote extraction.

### Important alignment note

The app configuration defaults to:

```env
AZURE_CONTENT_UNDERSTANDING_ANALYZER_ID=insuranceQuoteExtractor
```

Make sure the analyzer you create uses **that exact ID**, or update the environment/app setting to match the ID you created.

### Option A — Use the Python helper script

```powershell
cd func_app
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python setup_analyzer.py
```

If needed, edit `func_app/setup_analyzer.py` first so `ANALYZER_ID` matches `insuranceQuoteExtractor`.

### Option B — Use the PowerShell script

```powershell
cd func_app
.\create_analyzer.ps1
```

### Verification

After creation, confirm the analyzer exists and is ready before testing uploads.

---

## 11) Publish the Azure Function App

The Function App processes uploaded files from Blob Storage and writes extracted results to PostgreSQL.

### Step 1: Install dependencies locally

```powershell
cd func_app
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Step 2: Publish to Azure

```powershell
func azure functionapp publish quotecompare-func --build remote --python
```

### Why remote build is recommended

It avoids local packaging issues and is the most reliable path for this app.

### App settings expected on the Function App

The Bicep template configures these automatically:

- `AzureWebJobsStorage__accountName`
- `QuoteStorage__blobServiceUri`
- `QuoteStorage__queueServiceUri`
- `CU_ENDPOINT`
- `PG_HOST`
- `PG_DATABASE`
- `PG_USER`
- `PG_PASSWORD`
- `ACS_SENDER`
- `NOTIFICATION_EMAIL`

---

## 12) Optional: deploy the backend API to Azure App Service

For a **demo-only environment**, it is cheaper to keep the backend local. Only do this if you need a fully hosted API.

### Step 1: Enable the backend web app in Bicep

In `infra/main.parameters.json`, set:

```json
"enableBackendWebApp": {
  "value": true
}
```

Then redeploy the template.

### Step 2: Deploy the backend code

You can deploy using zip deploy, container deployment, or App Service code deployment.

A simple starting option is:

```powershell
cd backend
Compress-Archive -Path * -DestinationPath ..\backend.zip -Force
az webapp deploy --resource-group rg-quote-comparison --name quotecompare-api --src-path ..\backend.zip --type zip
```

### Backend startup configuration

The Bicep template already sets:

- `DATABASE_URL`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_CONTENT_UNDERSTANDING_ENDPOINT`
- `AZURE_CONTENT_UNDERSTANDING_ANALYZER_ID`

The startup command is configured to run:

```bash
gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind=0.0.0.0:$PORT
```

---

## 13) Optional: deploy the frontend

### Easiest options

1. **Keep it local for demos** using `npm run dev`
2. Deploy it as a container using the existing `frontend/Dockerfile`
3. Deploy the built `dist/` folder to Azure Static Web Apps or Storage Static Website hosting

### Build the frontend

```powershell
cd frontend
npm install
npm run build
```

The built files will be created in `frontend/dist/`.

---

## 14) End-to-end verification checklist

After setup, verify the following in order:

### Local checks

- [ ] `http://localhost:8000/api/health` returns `status: ok`
- [ ] `http://localhost:5173` or `http://localhost:3000` opens the UI
- [ ] `python seed_data.py` completes without error
- [ ] Existing accounts/comparisons load in the dashboard

### Azure checks

- [ ] `az bicep build --file infra/main.bicep` succeeds
- [ ] `az deployment group create ...` completes successfully
- [ ] The Function App publishes successfully
- [ ] The Content Understanding analyzer exists and is ready
- [ ] Uploading a PDF, DOCX, or XLSX creates or updates quote data
- [ ] The `quote-documents` blob container receives uploaded files
- [ ] PostgreSQL contains new rows after processing

---

## 15) Common issues and fixes

### Issue: backend starts but cannot connect to PostgreSQL

**Symptoms**
- `DATABASE_URL` points to localhost unexpectedly
- API startup fails on DB connection

**Fix**
- Verify `backend/.env` exists and contains the correct `DATABASE_URL`
- Start Uvicorn from `backend/` or use `--app-dir backend`
- If using Azure PostgreSQL, make sure your current public IP is in the firewall rules

### Issue: the frontend loads but API calls fail

**Fix**
- Make sure the backend is running on `http://localhost:8000`
- Confirm `frontend/vite.config.ts` still proxies `/api` to `http://localhost:8000`
- Check `CORS_ORIGINS` in `backend/.env`

### Issue: uploaded files do not extract correctly

**Fix**
- Ensure `AZURE_CONTENT_UNDERSTANDING_ANALYZER_ID` matches the analyzer you created
- Confirm the analyzer status is `ready`
- Check the Function App logs after uploading the file
- Verify `quote-documents` is the configured blob container

### Issue: Function App publish succeeds but the function does not process blobs

**Fix**
- Confirm the Function App has storage RBAC access
- Confirm `QuoteStorage__blobServiceUri` and `AzureWebJobsStorage__accountName` are set
- Use remote build publish:

```powershell
func azure functionapp publish quotecompare-func --build remote --python
```

### Issue: `npm run dev` or `uvicorn` exits immediately

**Fix**
- Reinstall dependencies:

```powershell
cd frontend
npm install

cd ..\backend
pip install -r requirements.txt
```

- Make sure the correct Python version and virtual environment are active

---

## 16) Demo-friendly cost guidance

If this app is only for demos:

- Keep `enableBackendWebApp=false` unless you really need hosted backend APIs
- Prefer `gpt-4.1-mini` over `gpt-4.1` for routine demo extraction and analysis
- Keep PostgreSQL on a small burstable SKU such as `Standard_B1ms`
- Use local frontend/backend during workshops and only keep Azure services running when needed

---

## 17) Recommended setup order for a brand-new environment

If someone is setting this up for the first time, follow this exact order:

1. Clone the repo
2. Create `backend/.env`
3. Run the app locally with Docker or local Python/Node
4. Verify `http://localhost:8000/api/health`
5. Deploy Azure infrastructure with `infra/main.bicep`
6. Create the Content Understanding analyzer
7. Publish the Function App
8. Test a real file upload (PDF, DOCX, XLSX)
9. Optionally deploy the backend Web App
10. Optionally deploy the frontend

---

## 18) Files to know

| File | Purpose |
|---|---|
| `README.md` | Basic project overview |
| `SETUP_GUIDE.md` | This full step-by-step guide |
| `backend/.env.example` | Backend environment template |
| `docker-compose.yml` | Fastest local full-stack run |
| `infra/main.bicep` | Azure infrastructure definition |
| `infra/main.parameters.json` | Parameter values for Azure deployment |
| `func_app/setup_analyzer.py` | Creates the Content Understanding analyzer |
| `func_app/process_quote/__init__.py` | Blob-trigger quote processing logic |

---

## 19) Final recommendation

For the smoothest demo setup:

- run **frontend + backend locally**
- deploy **storage + PostgreSQL + AI + Function App** to Azure
- keep the backend App Service **disabled** unless you need a fully hosted experience

This gives the best mix of **low cost**, **easy troubleshooting**, and **reliable demos**.
