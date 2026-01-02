import mimetypes

ALLOWED = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}

def validate_file(filename):
    mime, _ = mimetypes.guess_type(filename)
    if mime not in ALLOWED:
        raise ValueError("Unsupported or dangerous file type detected")
