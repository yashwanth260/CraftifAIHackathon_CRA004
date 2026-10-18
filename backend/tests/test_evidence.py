import pytest
import hashlib
from pathlib import Path
from backend.app.services.evidence_service import sanitize_path, calculate_sha256
from backend.app.config import EVIDENCE_DIR

def test_sanitize_path_prevent_traversal():
    base = EVIDENCE_DIR
    safe = base / "valid_file.jpg"
    assert sanitize_path(safe, base) == safe.resolve()

    # Path traversal attempt
    traversal = base / ".." / ".." / "windows" / "system32" / "cmd.exe"
    with pytest.raises(ValueError, match="Path traversal detected"):
        sanitize_path(traversal, base)

def test_sha256_calculation(tmp_path):
    data = b"Industrial Safety Sentinel Tamper Check Test Data"
    test_file = tmp_path / "test_artifact.bin"
    test_file.write_bytes(data)
    hash_val = calculate_sha256(test_file)
    expected = hashlib.sha256(data).hexdigest()
    assert len(hash_val) == 64
    assert hash_val == expected
