from __future__ import annotations

from mongodb import mongo_repository


def test_mongodb_sidecar_is_optional_without_configuration():
    health = mongo_repository.health()
    assert health["enabled"] is False
    assert health["status"] == "not_configured"