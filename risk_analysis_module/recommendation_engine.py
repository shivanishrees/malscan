def recommend(risk_score):
    if risk_score >= 70:
        return "Delete immediately. High risk malware detected."
    elif risk_score >= 30:
        return "Quarantine the file and avoid execution."
    else:
        return "File appears safe. No action required."
