from fastapi import FastAPI, UploadFile, File
import os, shutil

from reconstruction_module.file_validator import validate_file
from reconstruction_module.hash_utils import compute_sha256
from reconstruction_module.docx_sanitizer import sanitize_docx
from reconstruction_module.pdf_sanitizer import sanitize_pdf
from reconstruction_module.quarantine import quarantine_file
from reconstruction_module.secure_delete import secure_delete

app = FastAPI()

UPLOADS = "uploads/"
RECON = "reconstructed/"
os.makedirs(UPLOADS, exist_ok=True)
os.makedirs(RECON, exist_ok=True)

@app.post("/reconstruct")
async def reconstruct_file(file: UploadFile = File(...)):
    validate_file(file.filename)
    saved_path = os.path.join(UPLOADS, file.filename)

    with open(saved_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_hash = compute_sha256(saved_path)

    # choose sanitize routine
    if file.filename.endswith(".docx"):
        clean_path = os.path.join(RECON, f"safe_{file.filename}")
        sanitize_docx(saved_path, clean_path)

    elif file.filename.endswith(".pdf"):
        clean_path = os.path.join(RECON, f"safe_{file.filename}")
        sanitize_pdf(saved_path, clean_path)

    # quarantine original
    quarantine_file(saved_path, file_hash, "recon module")

    return {
        "safe_file": clean_path,
        "hash": file_hash
    }
@app.delete("/secure-delete/{file_hash}")
def secure_delete_file(file_hash: str):
    file_path = f"quarantine/{file_hash}"
    meta_path = f"{file_path}.json"

    secure_delete(file_path)

    if os.path.exists(meta_path):
        secure_delete(meta_path)

    return {
        "status": "success",
        "message": "File securely deleted from quarantine"
    }

