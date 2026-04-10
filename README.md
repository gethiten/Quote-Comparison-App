# Quote Comparison App

Commercial property insurance quote comparison tool with AI-powered analysis.

## Full Setup Guide

For complete local setup, Azure provisioning, deployment, verification, and troubleshooting steps, see [`SETUP_GUIDE.md`](./SETUP_GUIDE.md).

For a quick go-live list, see [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md).

For the final live demo sign-off, see [`DEMO_READINESS_CHECKLIST.md`](./DEMO_READINESS_CHECKLIST.md).

## Architecture Diagram

```mermaid
flowchart LR
    user([User / Broker])
    ui[Frontend UI\nReact + Vite]
    api[Backend API\nFastAPI]

    subgraph azure[Azure Resource Group]
        storage[Azure Blob Storage\nquote-documents container]
        function[Azure Function App\nBlob Trigger: process_quote]
        ai[Azure AI Services\nContent Understanding + GPT]
        db[(Azure PostgreSQL\nquote_comparison)]
        email[Azure Communication Services\nEmail notifications]
    end

    user --> ui

    %% Flow 1: direct UI/API path
    ui -->|Direct API requests| api
    api -->|Read/write app data| db
    api -->|Optional direct extraction| ai
    api -->|Return comparisons and quotes| ui

    %% Flow 2: event-driven ingestion path
    ui -->|Upload quote document| api
    api -->|Store file| storage
    storage -->|Blob created event| function
    function -->|Read document| storage
    function -->|Extract quote fields| ai
    function -->|Persist extracted data| db
    function -->|Send notification| email
```

### Supported Flows

#### 1. Direct UI/API flow

- The UI calls the FastAPI backend for accounts, properties, quotes, comparisons, and scoring views.
- The backend reads and writes application data in Azure PostgreSQL.
- In some cases, the backend can also call Azure AI Services directly for analysis or extraction support.
- The UI renders data returned from the database-backed API.

#### 2. Azure event-driven document processing flow

- A user uploads a quote document from the UI.
- The backend stores the file in Azure Blob Storage.
- Blob creation triggers the Azure Function App.
- The Function reads the document, calls Azure AI Services, extracts quote fields, and writes normalized results to Azure PostgreSQL.
- Optional email notifications are sent after successful processing.

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend  | Python, FastAPI, SQLAlchemy 2.0     |
| Database | PostgreSQL                          |
| AI       | Azure OpenAI GPT-4o                 |
| Storage  | Azure Blob Storage                  |
| Deploy   | Azure App Service / Docker          |

## Quick Start

### Prerequisites
- Node.js 20+, Python 3.12+, PostgreSQL 16+
- (Optional) Docker & Docker Compose

### Run with Docker Compose

```bash
cp backend/.env.example backend/.env   # edit with your credentials
docker compose up --build
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs

### Run Locally

**Backend:**
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env                              # edit DATABASE_URL, etc.
uvicorn app.main:app --reload
python seed_data.py                               # seed sample data
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Vite dev server proxies `/api` to the backend at `http://localhost:8000`.

## Project Structure

```
backend/
  app/
    api/          # FastAPI route modules
    agents/       # Azure OpenAI AI agents
    models/       # SQLAlchemy ORM models
    schemas/      # Pydantic request/response schemas
    services/     # Business logic (blob, document parser, scoring)
    config.py     # Settings from .env
    database.py   # DB engine & session
    main.py       # FastAPI application factory
  alembic/        # Database migrations
  seed_data.py    # Sample data seeder

frontend/
  src/
    api/          # Backend API client
    components/   # React components (layout, comparison, ui)
    data/         # Sample/fallback data
    pages/        # Dashboard & ComparisonView pages
    types/        # TypeScript interfaces
    utils/        # Formatters, scoring, gap detection
```

## License

Copyright (c) Microsoft Corporation. All rights reserved.

Licensed under the MIT License.

## Disclaimer

This project is provided as a **sample/demo application** for reference purposes only. It is not intended for production use without additional security review, compliance validation, performance testing, and operational hardening.

**THIS SAMPLE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND**, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
