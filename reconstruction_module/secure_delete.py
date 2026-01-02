import os
import random

def secure_delete(path, passes=2):
    if not os.path.exists(path):
        return

    size = os.path.getsize(path)
    with open(path, "wb") as f:
        for _ in range(passes):
            f.write(os.urandom(size))
    os.remove(path)
