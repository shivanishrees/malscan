import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const navigate = useNavigate();

  const handleScan = () => {
    if (!file) {
      alert("Please upload a file");
      return;
    }

    const scanResult = {
      fileName: file.name,
      riskScore: 78,
      status: "Suspicious",
      reasons: [
        "Executable disguised as document",
        "Double extension detected",
        "Unknown community reputation",
      ],
      impacts: [
        "May steal credentials",
        "May download additional malware",
      ],
      sha256:
        "9a4b16beb818c26f8433838614c9d80da29c90c3cf9cf4fc48148c91a520kce3d126b9",
      size: "1.2 MB",
      source: "Download",
    };

    navigate("/result", { state: scanResult });
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
