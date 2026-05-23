import requests
import json

response = requests.post(
    "http://127.0.0.1:8000/api/auth/login",
    headers={
        "Content-Type": "application/json",
        "X-Tenant-ID": "aits-hyd-001"
    },
    json={
        "college_id": "admin@acadmix.org",
        "password": "admin123"
    }
)

print(f"Status Code: {response.status_code}")
try:
    print(json.dumps(response.json(), indent=2))
except:
    print(response.text)
