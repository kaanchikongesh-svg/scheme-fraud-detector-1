"""
SchemeSecure AI — Backend Package.
Ensures the backend directory is in sys.path so sibling imports resolve cleanly
when running from project root (uvicorn backend.main:app) or from backend/ directory.
"""
import sys
from pathlib import Path

_backend_dir = str(Path(__file__).resolve().parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
