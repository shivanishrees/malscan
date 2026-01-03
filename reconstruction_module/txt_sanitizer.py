def sanitize_txt(source, dest):
    with open(source, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    safe_content = (
        "This is a reconstructed safe file\n\n"
        + content
    )

    with open(dest, "w", encoding="utf-8") as f:
        f.write(safe_content)
