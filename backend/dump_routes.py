import json
from app.main import app
from fastapi.routing import APIRoute

routes = []
for route in app.routes:
    if isinstance(route, APIRoute):
        routes.append({
            "path": route.path,
            "name": route.name,
            "methods": list(route.methods)
        })

with open("backend_routes.json", "w") as f:
    json.dump(routes, f, indent=2)
print(f"Dumped {len(routes)} routes.")
