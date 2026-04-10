# Quote Comparison App — Final Demo Readiness Checklist

Use this checklist right before presenting the live demo.

---

## 1) Live demo URLs

- **Frontend UI:** `https://quotecomparestr2026.z19.web.core.windows.net/`
- **Backend API health:** `https://quotecompare-api.azurewebsites.net/api/health`
- **Function App host:** `https://quotecompare-func.azurewebsites.net/`

---

## 2) Pre-demo smoke test

- [ ] Frontend URL opens successfully
- [ ] Comparison page loads without errors
- [ ] `api/health` returns `{"status":"ok","version":"2.0.0"}`
- [ ] Existing sample comparison is visible in the UI
- [ ] Azure Function App shows `Running`

---

## 3) Demo flow to show

- [ ] Open dashboard / comparison view
- [ ] Show imported quote/account data already available
- [ ] Upload one fresh sample quote file
- [ ] Wait for extraction/processing to complete
- [ ] Show extracted fields and comparison results
- [ ] Highlight scoring / analysis output

---

## 4) Backup plan

If a fresh upload is slow during the demo:

- [ ] Use the already-loaded comparison data
- [ ] Show the existing account `Storage Upload Imports`
- [ ] Use the health endpoint as proof the backend is live
- [ ] Use the static site URL as proof the UI is deployed

---

## 5) Final environment check

- [ ] `quotecompare-api` is healthy
- [ ] `quotecompare-func` is running
- [ ] `quotecomparestr2026` static website returns `200`
- [ ] PostgreSQL data is available in the app
- [ ] Personal GitHub repo is the active source of truth

---

## 6) Demo-ready sign-off

- [ ] Azure deployment completed successfully
- [ ] UI and API verified live
- [ ] Function processing verified
- [ ] Sample comparison visible
- [ ] Demo environment is ready
