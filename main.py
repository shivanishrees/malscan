from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import shutil
from mimetypes import guess_type

# ---- your internal modules ----
from reconstruction_module.file_validator import validate_file
from reconstruction_module.pdf_sanitizer import sanitize_pdf
from reconstruction_module.docx_sanitizer import sanitize_docx
from reconstruction_module.txt_sanitizer import sanitize_txt
from reconstruction_module.hash_utils import compute_sha256
from reconstruction_module.quarantine import quarantine_file
from reconstruction_module.secure_delete import secure_delete

# ---- app init ----
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- directories ----
UPLOADS = "uploads"
RECON = "reconstructed"
QUARANTINE = "quarantine"

os.makedirs(UPLOADS, exist_ok=True)
os.makedirs(RECON, exist_ok=True)
os.makedirs(QUARANTINE, exist_ok=True)

# =========================================================
# RECONSTRUCT ENDPOINT
# =========================================================
@app.post("/reconstruct")
async def reconstruct_file(file: UploadFile = File(...)):

    # 1. validate extension
    ext = validate_file(file.filename)

    saved_path = os.path.join(UPLOADS, file.filename)

    # 2. save uploaded file
    with open(saved_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # 3. hash original
    file_hash = compute_sha256(saved_path)

    # 4. sanitize
    clean_path = os.path.join(RECON, f"safe_{file.filename}")

    if ext == ".pdf":
        sanitize_pdf(saved_path, clean_path)

    elif ext == ".docx":
        sanitize_docx(saved_path, clean_path)

    elif ext == ".txt":
        sanitize_txt(saved_path, clean_path)

    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type"
        )

    # 5. quarantine original
    quarantine_file(saved_path, file_hash, "reconstruction")

    return {
        "safe_file": os.path.basename(clean_path),
        "hash": file_hash
    }

# =========================================================
# DOWNLOAD RECONSTRUCTED FILE
# =========================================================
from mimetypes import guess_type

@app.get("/reconstructed/{filename}")
def get_reconstructed_file(filename: str):
    file_path = os.path.join("reconstructed", filename)
    media_type, _ = guess_type(file_path)

    return FileResponse(
        file_path,
        media_type=media_type or "application/octet-stream",
        filename=filename
    )


# =========================================================
# SECURE DELETE (QUARANTINE)
# =========================================================
@app.delete("/secure-delete/{file_hash}")
def secure_delete_file(file_hash: str):
    file_path = os.path.join(QUARANTINE, file_hash)
    meta_path = f"{file_path}.json"

    if os.path.exists(file_path):
        secure_delete(file_path)

    if os.path.exists(meta_path):
        secure_delete(meta_path)

    return {
        "status": "success",
        "message": "File securely deleted from quarantine"
    }
