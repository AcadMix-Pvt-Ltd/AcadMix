"""Quick DB connectivity test — checks if Supabase is reachable."""
import asyncio
import time
from database import engine, _POOL_SIZE, _MAX_OVERFLOW
from sqlalchemy import text

async def test():
    print(f"Pool config: size={_POOL_SIZE}, max_overflow={_MAX_OVERFLOW}, max_total={_POOL_SIZE + _MAX_OVERFLOW}")
    
    # Test 3 consecutive connections
    for i in range(3):
        t0 = time.monotonic()
        try:
            async with engine.connect() as conn:
                r = await conn.execute(text("SELECT 1"))
                elapsed = (time.monotonic() - t0) * 1000
                print(f"  [{i+1}] DB OK (SELECT 1 = {r.scalar()}) in {elapsed:.0f}ms")
        except Exception as e:
            elapsed = (time.monotonic() - t0) * 1000
            print(f"  [{i+1}] FAILED after {elapsed:.0f}ms: {type(e).__name__}: {e}")

asyncio.run(test())
