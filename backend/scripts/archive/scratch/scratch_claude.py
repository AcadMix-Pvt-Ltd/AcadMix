import asyncio
import os
import json
from dotenv import load_dotenv

load_dotenv()
from app.services.llm_gateway import _get_vertex_client
from app.core.config import settings
from anthropic import AnthropicVertex, APIStatusError

_get_vertex_client()  # triggers credential file export

print(f"Using ADC path: {os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', 'Missing!')}")

def test_region(region):
    print(f"\n--- Testing region {region} ---")
    try:
        client = AnthropicVertex(region=region, project_id=settings.VERTEX_PROJECT_ID)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=100,
            messages=[{"role": "user", "content": "Hello compute."}]
        )
        print(f"PASS SUCCESS on {region}! Response: {response.content[0].text}")
    except APIStatusError as e:
        print(f"FAIL FAILED on {region}! Code {e.status_code}: {e.message}")
    except Exception as e:
        print(f"FAIL FAILED mysteriously on {region}! Error: {e}")

test_region("us-central1")
test_region("us-east5")
test_region("europe-west1")
test_region("asia-south1")
test_region("us-east4")
