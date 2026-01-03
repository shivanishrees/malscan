import os

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}

def validate_file(filename: str):
    if not filename:
        raise ValueError("No filename provided")

    ext = os.path.splitext(filename.lower())[1]

    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {ext}")

    return ext   # IMPORTANT: return extension
