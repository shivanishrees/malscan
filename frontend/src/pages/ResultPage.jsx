import React from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function ResultPage() {
  const location = useLocation();
  const data = location.state;

  if (!data) {
    return (
      <div style={{ color: "#fff", padding: "40px" }}>
        No scan data available
      </div>
    );
  }

  const handleReconstruct = async () => {
  try {
    const response = await fetch(
      `http://127.0.0.1:8000/reconstructed/${data.safeFile}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch file");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = data.safeFile;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    console.error(err);
    alert("Failed to download reconstructed file");
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
        <h1>Scan Result</h1>

        <div
          style={{
            background: "#3a3a50",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <span
            style={{
              background: "#e0a800",
              color: "#000",
              padding: "5px 10px",
              borderRadius: "5px",
            }}
          >
            SUSPICIOUS
          </span>
          <p>Risk Score: {data.riskScore}/100</p>
        </div>

        <div style={{ display: "flex", gap: "20px" }}>
          <div
            style={{
              flex: 1,
              background: "#3a3a50",
              padding: "20px",
              borderRadius: "10px",
            }}
          >
            <h3>Why this file is risky?</h3>
            <ul>
              {data.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          <div
            style={{
              flex: 1,
              background: "#3a3a50",
              padding: "20px",
              borderRadius: "10px",
            }}
          >
            <h3>Possible Impacts</h3>
            <ul>
              {data.impacts.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          </div>
        </div>

        <div
          style={{
            background: "#3a3a50",
            padding: "20px",
            borderRadius: "10px",
            marginTop: "20px",
          }}
        >
          <h3>File Information</h3>
          <p>Name: {data.fileName}</p>
          <p>Size: {data.size}</p>
          <p>Source: {data.source}</p>
          <p>SHA-256: {data.sha256}</p>

          <button
            onClick={handleReconstruct}
            style={{
              marginTop: "10px",
              padding: "10px 20px",
              background: "#e0a800",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Reconstruct & Download
          </button>
        </div>
      </div>
    </div>
  );
}
