import json
import re
from pathlib import Path

# Load backend routes
with open("C:/AcadMix/backend/backend_routes.json") as f:
    backend_routes = json.load(f)

backend_paths = set(r["path"] for r in backend_routes)
# Also normalise them by replacing path params like {id} with {}
def normalize_backend_path(p):
    # remove trailing slash
    p = p.rstrip('/')
    return re.sub(r"\{[^}]+\}", "{}", p)

backend_patterns = set(normalize_backend_path(p) for p in backend_paths)

# Now read api.ts
api_ts_path = Path("C:/AcadMix/frontend/src/services/api.ts")
content = api_ts_path.read_text(encoding="utf-8")

# Simple regex to find api.get('/route') or api.post(`/route/${id}`)
# We look for api.(get|post|put|delete|patch)\((['"]|`)(.*?)(['"]|`)
matches = re.findall(r"api\.(get|post|put|delete|patch)\(\s*(['\"`])(.*?)\2", content)

missing_routes = []
matched_routes = []

def normalize_frontend_path(p):
    p = p.rstrip('/')
    if not p.startswith('/api') and p.startswith('/'):
        p = '/api' + p
    # replace string interpolation variables ${...} with {}
    # ensure no double slashes are created
    p = re.sub(r"\$\{[^}]+\}", "{}", p)
    p = re.sub(r"//+", "/", p)
    return p

for method, _, path in matches:
    if not path.startswith('/'):
        continue # skip base urls etc
        
    norm_path = normalize_frontend_path(path)
    
    # check if norm_path matches any backend pattern
    if norm_path in backend_patterns:
        matched_routes.append((method, norm_path))
    else:
        # try without /api prefix
        alt_path = norm_path.replace('/api', '')
        if alt_path in backend_patterns:
            matched_routes.append((method, norm_path))
        else:
            # Special case for query params embedded in path, strip them
            clean_path = norm_path.split('?')[0]
            if clean_path in backend_patterns:
                matched_routes.append((method, clean_path))
            else:
                missing_routes.append((method, path, norm_path))

print(f"Total frontend endpoints extracted: {len(matches)}")
print(f"Matched routes: {len(matched_routes)}")
print(f"Potentially missing routes: {len(missing_routes)}")

with open("C:/AcadMix/backend/audit_results.txt", "w") as f:
    f.write("MISSING ROUTES:\n")
    for method, orig, norm in missing_routes:
        f.write(f"[{method.upper()}] {orig} (Normalized: {norm})\n")
