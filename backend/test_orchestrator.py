import asyncio
import logging
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import AdminSessionLocal
from app.services.insights_orchestrator import orchestrate_query
from app.schemas.insights import InsightsQueryRequest

logging.basicConfig(level=logging.INFO)

async def test_mv():
    async with AdminSessionLocal() as db:
        # Mock user context
        current_user = {
            "id": 1,
            "role": "ADMIN",
            "college_id": "aits"
        }
        
        request = InsightsQueryRequest(
            message="attendance by department",
            session_history=[],
            active_college_id=None
        )
        
        try:
            response = await orchestrate_query(request, current_user, db)
            print("\n=== SUCCESS ===")
            print(f"Summary: {response.summary}")
            print(f"Chart: {response.chart_suggestion} (X: {response.x_column}, Y: {response.y_column})")
            print(f"Generated SQL (Bypassed if KNOWN_MV): {response.generated_sql}")
            print(f"Data Rows: {len(response.data)}")
        except Exception as e:
            print("\n=== ERROR ===")
            print(e)

if __name__ == "__main__":
    asyncio.run(test_mv())
