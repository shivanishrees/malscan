import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const navigate = useNavigate();

 const handleScan = async () => {
  if (!file) {
    alert("Please upload a file");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    // Call FastAPI reconstruction
    const response = await fetch("http://127.0.0.1:8000/reconstruct", {
  method: "POST",
  body: formData,
});

if (!response.ok) {
  const text = await response.text();
  console.error(text);
  alert("Backend error during reconstruction");
  return;
}

const result = await response.json();


    navigate("/result", {
      state: {
        fileName: file.name,
        sha256: result.hash,
        safeFile: result.safe_file,
        riskScore: 78,
        status: "Suspicious",
        reasons: [
          "Macro content detected",
          "Sanitized during reconstruction",
        ],
        impacts: [
          "Malicious content removed",
        ],
        size: `${(file.size / 1024).toFixed(2)} KB`,
        source: "User Upload",
      },
    });

  } catch (err) {
    console.error(err);
    alert("Reconstruction failed");
  }
};

  return (
    <div
      style={{
        display: "flex",
        background: "#2b2b3d",
        minHeight: "100vh",
      }}
    >
      <Sidebar />

      <div
        style={{
          marginLeft: "220px",
          padding: "40px",
          width: "100%",
          color: "#fff",
        }}
      >
        <h1>Upload File for Malware Scan</h1>

        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          style={{
            marginTop: "20px",
            background: "#3a3a50",
            padding: "10px",
            border: "none",
            color: "#fff",
            borderRadius: "6px",
            width: "100%",
          }}
        />

        <br />
        <br />

        <button
          onClick={handleScan}
          style={{
            padding: "10px 20px",
            background: "#4f99ff",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Scan File
        </button>
      </div>
    </div>
  );
}
