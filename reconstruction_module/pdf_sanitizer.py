import pikepdf

def sanitize_pdf(input_path, output_path):
    with pikepdf.open(input_path, allow_overwriting_input=True) as pdf:

        root = pdf.Root

        # Remove JavaScript actions safely
        for key in ["/OpenAction", "/AA"]:
            if key in root:
                del root[key]

        # Remove AcroForm (common JS carrier)
        if "/AcroForm" in root:
            del root["/AcroForm"]

        # DO NOT delete /Names blindly
        # Instead remove JS from Names tree
        if "/Names" in root:
            names = root["/Names"]
            if "/JavaScript" in names:
                del names["/JavaScript"]

        # Save with linearization OFF (important)
        pdf.save(output_path, linearize=False)
