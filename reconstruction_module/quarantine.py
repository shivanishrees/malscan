import os, shutil, json
from datetime import datetime

QUARANTINE_DIR = "quarantine/"

def quarantine_file(orig_path, sha, reason):
    os.makedirs(QUARANTINE_DIR, exist_ok=True)
    dest_path = os.path.join(QUARANTINE_DIR, sha)
    shutil.move(orig_path, dest_path)

    # metadata
    meta = {
        "hash": sha,
        "reason": reason,
        "time": datetime.now().isoformat()
    }
    with open(dest_path + ".json", "w") as f:
        json.dump(meta, f)
    return dest_path
