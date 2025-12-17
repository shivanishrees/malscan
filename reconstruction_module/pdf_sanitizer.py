import fitz  # PyMuPDF

def sanitize_pdf(source, dest):
    doc = fitz.open(source)
    clean = fitz.open()

    for p in doc:
        new = clean.new_page(width=p.rect.width, height=p.rect.height)
        new.show_pdf_page(
            new.rect,
            doc,
            p.number
        )

    clean.save(dest)
    clean.close()
    doc.close()
