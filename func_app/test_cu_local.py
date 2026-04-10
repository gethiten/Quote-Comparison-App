"""Test Content Understanding analysis locally."""
import base64
import json
import time
import requests
from azure.identity import DefaultAzureCredential

CU_ENDPOINT = "https://quotecompare-cu.cognitiveservices.azure.com"
API_VERSION = "2025-11-01"
ANALYZER_ID = "prebuilt-read"

credential = DefaultAzureCredential()
token = credential.get_token("https://cognitiveservices.azure.com/.default").token

# Read test PDF
with open("test_quote_travelers.pdf", "rb") as f:
    file_data = f.read()

file_b64 = base64.b64encode(file_data).decode("ascii")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
}

analyze_url = f"{CU_ENDPOINT}/contentunderstanding/analyzers/{ANALYZER_ID}:analyze?api-version={API_VERSION}"
body = {"inputs": [{"data": file_b64, "mimeType": "application/pdf"}]}

print("Submitting analysis...")
resp = requests.post(analyze_url, headers=headers, json=body, timeout=30)
print(f"Status: {resp.status_code}")

if resp.status_code != 202:
    print(f"Error: {resp.text}")
    exit(1)

result_url = resp.headers.get("Operation-Location")
print(f"Polling: {result_url}")

for i in range(60):
    time.sleep(2)
    poll = requests.get(result_url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    result = poll.json()
    status = result.get("status", "")
    print(f"  [{i}] Status: {status}")
    if status == "Succeeded":
        print("\n=== FULL RESULT ===")
        print(json.dumps(result, indent=2))
        
        # Extract markdown
        contents = result.get("result", {}).get("contents", [])
        for c in contents:
            md = c.get("markdown", "")
            if md:
                print("\n=== MARKDOWN TEXT ===")
                print(md)
        break
    elif status in ("Failed", "Canceled"):
        print(f"Error: {json.dumps(result, indent=2)}")
        break
