def source_risk(domain_reputation):
    if domain_reputation == "malicious":
        return 30
    elif domain_reputation == "unknown":
        return 15
    return 0
