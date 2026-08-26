import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app, root, health_check, favicon
from database import SessionLocal

def test_routes():
    print("=" * 60)
    print("VERIFYING FASTAPI ROUTES AND ENDPOINTS")
    print("=" * 60)

    # 1. Test root() handler
    r_root = root()
    print("[1] root() handler returned:", r_root)
    assert r_root == {
        "status": "success",
        "message": "AI Scheme Leakage Detector API is running"
    }, f"Root endpoint returned unexpected payload: {r_root}"

    # 2. Test health_check() handler with db session
    db = SessionLocal()
    try:
        r_health = health_check(db)
        print("[2] health_check(db) handler returned:", r_health)
        assert r_health["status"] == "ok", f"Health endpoint returned unexpected status: {r_health}"
        assert r_health["app"] == "SchemeSecure AI", f"Unexpected app branding: {r_health.get('app')}"
        assert r_health["database"] == "connected", f"Database check failed: {r_health.get('database')}"
    finally:
        db.close()

    # 3. Test favicon() handler
    r_favicon = favicon()
    print("[3] favicon() handler status_code:", r_favicon.status_code)
    assert r_favicon.status_code == 204, f"Favicon endpoint returned unexpected status: {r_favicon.status_code}"

    # 4. Check FastAPI route registry
    route_map = {}
    for route in app.routes:
        if hasattr(route, "path") and hasattr(route, "methods"):
            methods = ",".join(sorted(getattr(route, "methods", [])))
            path = getattr(route, "path", "")
            name = getattr(route, "name", "route")
            route_map[f"{methods} {path}"] = name

    print("\n[4] Checking registered routes:")
    assert "GET /" in route_map, "Missing 'GET /' in registered routes!"
    print("  [OK] 'GET /' -> registered as", route_map["GET /"])

    assert "GET /health" in route_map, "Missing 'GET /health' in registered routes!"
    print("  [OK] 'GET /health' -> registered as", route_map["GET /health"])

    assert "GET /favicon.ico" in route_map, "Missing 'GET /favicon.ico' in registered routes!"
    print("  [OK] 'GET /favicon.ico' -> registered as", route_map["GET /favicon.ico"])

    assert "GET /api/v1/health" in route_map, "Missing 'GET /api/v1/health' in registered routes!"
    print("  [OK] 'GET /api/v1/health' -> registered as", route_map["GET /api/v1/health"])

    assert "GET /healthz" in route_map, "Missing 'GET /healthz' in registered routes!"
    print("  [OK] 'GET /healthz' -> registered as", route_map["GET /healthz"])

    assert "GET /api/v1/schemes" in route_map, "Missing 'GET /api/v1/schemes' in registered routes!"
    print("  [OK] 'GET /api/v1/schemes' -> registered as", route_map["GET /api/v1/schemes"])

    print("\n" + "=" * 60)
    print("ALL ENDPOINTS AND ROUTE DEFINITIONS VERIFIED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    test_routes()
