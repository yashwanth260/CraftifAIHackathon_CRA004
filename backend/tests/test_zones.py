from backend.app.services.zone_service import point_in_polygon

def test_point_in_polygon_logic():
    # Square polygon from (0.2, 0.2) to (0.6, 0.6)
    poly = [
        {"x": 0.2, "y": 0.2},
        {"x": 0.6, "y": 0.2},
        {"x": 0.6, "y": 0.6},
        {"x": 0.2, "y": 0.6}
    ]

    # Inside
    assert point_in_polygon(0.4, 0.4, poly) is True
    assert point_in_polygon(0.3, 0.5, poly) is True

    # Outside
    assert point_in_polygon(0.1, 0.1, poly) is False
    assert point_in_polygon(0.7, 0.4, poly) is False
    assert point_in_polygon(0.4, 0.9, poly) is False

def test_zone_crud_and_validation(client):
    # Rejection of invalid polygon (< 3 vertices)
    invalid_payload = {
        "name": "Invalid Line Zone",
        "polygon_coords": [{"x": 0.1, "y": 0.1}, {"x": 0.2, "y": 0.2}],
        "severity": "HIGH",
        "is_active": True,
        "dwell_time_seconds": 1.0,
        "required_ppe": []
    }
    resp = client.post("/api/zones", json=invalid_payload)
    assert resp.status_code == 422 or resp.status_code == 400

    # Valid polygon creation
    valid_payload = {
        "name": "Robotics Enclosure A",
        "polygon_coords": [
            {"x": 0.1, "y": 0.1},
            {"x": 0.5, "y": 0.1},
            {"x": 0.5, "y": 0.5},
            {"x": 0.1, "y": 0.5}
        ],
        "color": "#ef4444",
        "severity": "CRITICAL",
        "is_active": True,
        "dwell_time_seconds": 1.5,
        "required_ppe": ["HELMET", "VEST"]
    }
    create_resp = client.post("/api/zones", json=valid_payload)
    assert create_resp.status_code == 200
    zone_data = create_resp.json()
    assert zone_data["name"] == "Robotics Enclosure A"
    assert zone_data["severity"] == "CRITICAL"
    assert len(zone_data["polygon_coords"]) == 4

    zone_id = zone_data["id"]

    # List zones
    list_resp = client.get("/api/zones")
    assert list_resp.status_code == 200
    zones = list_resp.json()
    assert len(zones) >= 1
    assert any(z["id"] == zone_id for z in zones)

    # Update zone
    update_resp = client.put(f"/api/zones/{zone_id}", json={"severity": "HIGH", "is_active": False})
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["severity"] == "HIGH"
    assert updated["is_active"] is False

    # Delete zone
    del_resp = client.delete(f"/api/zones/{zone_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "DELETED"
