import React from "react";
import { useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  const menuStyle = (path) => ({
    padding: "8px 12px",
    borderRadius: "6px",
    marginBottom: "12px",
    cursor: "pointer",
    background:
      location.pathname === path ? "#3a3a50" : "transparent",
    color: "#fff",
  });

  return (
    <div
      style={{
        width: "220px",
        background: "#1f1f2e",
        color: "#fff",
        padding: "20px",
        minHeight: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
      }}
    >
      <h2 style={{ color: "#4f99ff", marginBottom: "40px" }}>
        MalScan
      </h2>

      {/* Sidebar order exactly as requested */}
      <div>
        <div style={menuStyle("/")}>New Scan</div>
        <div style={menuStyle("/result")}>Result</div>
        <div style={menuStyle("/reconstruct")}>Reconstruct</div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "20px",
          cursor: "pointer",
        }}
      >
        Sign Out
      </div>
    </div>
  );
}
