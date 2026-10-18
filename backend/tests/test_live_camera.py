import base64
import numpy as np
import cv2

def create_dummy_base64_frame():
    # Create simple 100x100 dummy frame
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    _, buffer = cv2.imencode(".jpg", img)
    return base64.b64encode(buffer).decode("utf-8")

def test_live_camera_analysis_no_helmet(client):
    b64_img = create_dummy_base64_frame()
    response = client.post(
        "/api/camera/analyze-frame",
        json={
            "image_base64": b64_img,
            "demo_ppe_mode": "NO_HELMET",
            "log_incident": False
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["overall_signal"] == "RED_ALERT"
    assert len(data["detections"]) > 0
    assert data["detections"][0]["has_helmet"] is False
    assert data["detections"][0]["signal"] == "RED_ALERT"

def test_live_camera_analysis_wearing_helmet(client):
    b64_img = create_dummy_base64_frame()
    response = client.post(
        "/api/camera/analyze-frame",
        json={
            "image_base64": b64_img,
            "demo_ppe_mode": "WEARING_HELMET",
            "log_incident": False
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["overall_signal"] == "GREEN_PASS"
    assert data["detections"][0]["has_helmet"] is True
    assert data["detections"][0]["signal"] == "GREEN_PASS"
