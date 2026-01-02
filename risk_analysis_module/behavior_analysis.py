def analyze_upload(source):
    if source == "email":
        return 25
    elif source == "usb":
        return 15
    elif source == "download":
        return 10
    return 5
