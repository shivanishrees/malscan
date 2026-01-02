community_db = {
    "hash1": {"malicious": 8, "clean": 1},
    "hash2": {"malicious": 0, "clean": 10}
}

def community_score(file_hash):
    data = community_db.get(file_hash)
    if not data:
        return 0

    total = data["malicious"] + data["clean"]
    return int((data["malicious"] / total) * 20)
