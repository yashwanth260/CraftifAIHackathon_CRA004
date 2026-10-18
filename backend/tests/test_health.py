def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "AI Safety Sentinel 360" in data["service"]

def test_system_status(client):
    response = client.get("/api/system/status")
    assert response.status_code == 200
    data = response.json()
    assert data["backend_status"] == "ONLINE"
    assert data["database_status"] == "CONNECTED"
    assert "inference_device" in data
    assert "tensorrt_status" in data

def test_models_status(client):
    response = client.get("/api/models/status")
    assert response.status_code == 200
    data = response.json()
    assert "person_model" in data
    assert "ppe_model" in data
