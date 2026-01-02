"""
explanation_engine.py

This module converts technical malware scan results
into simple, human-readable explanations for users.
"""


def explain(scan_result: dict) -> str:
    """
    Generate a human-readable explanation of the file risk.

    Expected scan_result format (example):
    {
        "malicious": True,
        "detections": 8,
        "file_type": "exe",
        "suspicious_apis": ["CreateRemoteThread", "WriteProcessMemory"]
    }
    """

    explanations = []

    # Basic malicious verdict
    if scan_result.get("malicious"):
        explanations.append(
            "This file is flagged as malicious based on security analysis."
        )
    else:
        explanations.append(
            "No known malware signatures were detected in this file."
        )

    # File type explanation
    file_type = scan_result.get("file_type")
    if file_type:
        explanations.append(
            f"The file type is '{file_type}', which is commonly abused by malware authors."
            if file_type in ["exe", "dll", "js", "bat"]
            else f"The file type is '{file_type}'."
        )

    # Suspicious API behavior
    suspicious_apis = scan_result.get("suspicious_apis", [])

    if "CreateRemoteThread" in suspicious_apis:
        explanations.append(
            "It attempts to inject code into another process, a technique often used by trojans or spyware."
        )

    if "WriteProcessMemory" in suspicious_apis:
        explanations.append(
            "It tries to modify the memory of another running process, which is a high-risk behavior."
        )

    # Detection count
    detections = scan_result.get("detections")
    if detections is not None and detections > 0:
        explanations.append(
            f"The file was detected by {detections} security engines."
        )

    return " ".join(explanations)
