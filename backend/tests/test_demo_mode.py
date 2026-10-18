def test_demo_load_and_clear_cycle(client):
    # 1. Load demo data
    load_resp = client.post("/api/demo/load")
    assert load_resp.status_code == 200
    assert load_resp.json()["status"] == "SUCCESS"
    assert load_resp.json()["incidents_created"] >= 5

    # 2. Check demo incidents exist and have is_demo=True
    list_resp = client.get("/api/incidents?is_demo=true")
    assert list_resp.status_code == 200
    incidents = list_resp.json()
    assert len(incidents) >= 5
    for inc in incidents:
        assert inc["is_demo"] is True
        assert inc["inference_mode"] == "DEMO"

    # 3. Check demo zones exist
    zones_resp = client.get("/api/zones")
    assert zones_resp.status_code == 200
    zones = zones_resp.json()
    assert any(z["id"] == "zone_demo_welding_cell" for z in zones)

    # 4. Clear demo data
    clear_resp = client.delete("/api/demo/clear")
    assert clear_resp.status_code == 200
    assert clear_resp.json()["status"] == "SUCCESS"

    # 5. Verify demo incidents are gone
    list_after = client.get("/api/incidents?is_demo=true")
    assert len(list_after.json()) == 0
