import time
from backend.app.services.rule_engine import SafetyRuleEngine

def test_rule_engine_deduplication():
    engine = SafetyRuleEngine(deduplication_window_seconds=2.0)
    now = 1000.0

    # First event should not be duplicate
    dup1 = engine.is_duplicate("cam1", 10, "RESTRICTED_ZONE_VIOLATION", "zoneA", current_time=now)
    assert dup1 is False

    # Second event 0.5s later should be recognized as duplicate
    dup2 = engine.is_duplicate("cam1", 10, "RESTRICTED_ZONE_VIOLATION", "zoneA", current_time=now + 0.5)
    assert dup2 is True

    # Different track ID should NOT be a duplicate
    dup3 = engine.is_duplicate("cam1", 11, "RESTRICTED_ZONE_VIOLATION", "zoneA", current_time=now + 0.5)
    assert dup3 is False

    # After deduplication window expires (3s later), should be allowed again
    dup4 = engine.is_duplicate("cam1", 10, "RESTRICTED_ZONE_VIOLATION", "zoneA", current_time=now + 3.0)
    assert dup4 is False

def test_rule_engine_severity_evaluation():
    engine = SafetyRuleEngine()

    sev1, r1 = engine.evaluate_severity("ZONE_AND_PPE_VIOLATION")
    assert sev1 == "CRITICAL"

    sev2, r2 = engine.evaluate_severity("RESTRICTED_ZONE_VIOLATION", zone_severity="CRITICAL")
    assert sev2 == "CRITICAL"

    sev3, r3 = engine.evaluate_severity("PPE_NON_COMPLIANCE")
    assert sev3 == "MEDIUM"

    sev4, r4 = engine.evaluate_severity("UNCERTAIN_SAFETY_OBSERVATION")
    assert sev4 == "LOW"

    sev5, r5 = engine.evaluate_severity("MONITORING_SYSTEM_ERROR")
    assert sev5 == "HIGH"

def test_should_combine():
    engine = SafetyRuleEngine()
    assert engine.should_combine(zone_violation=True, ppe_non_compliant=True) is True
    assert engine.should_combine(zone_violation=True, ppe_non_compliant=False) is False
    assert engine.should_combine(zone_violation=False, ppe_non_compliant=True) is False
