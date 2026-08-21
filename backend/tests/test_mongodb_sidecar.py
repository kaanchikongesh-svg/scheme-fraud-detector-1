from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from mongodb.repository import mongo_repository


def test_mongodb_sidecar_is_optional_without_configuration():
    repo = mongo_repository
    # When URI is not configured, it gracefully handles health check
    health = repo.health()
    assert "status" in health
    print(f"[OK] MongoDB health check verified: {health}")


if __name__ == "__main__":
    test_mongodb_sidecar_is_optional_without_configuration()
    print("[OK] All MongoDB sidecar tests passed!")