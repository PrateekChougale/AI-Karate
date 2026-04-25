"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scenarios, setScenarios] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (
        droppedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        droppedFile.type === "application/vnd.ms-excel" ||
        droppedFile.name.endsWith(".xlsx") ||
        droppedFile.name.endsWith(".xls")
      ) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Please upload a valid Excel file (.xlsx or .xls)");
      }
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const onButtonClick = () => {
    inputRef.current.click();
  };

  const handleGenerate = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate scenarios");
      }

      const data = await response.json();
      setScenarios(data.scenarios);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadJSON = () => {
    if (!scenarios) return;
    
    const jsonString = JSON.stringify(scenarios, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `karate-scenarios-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="layout-container">
      <h1 className="title">DRG to Karate Scenarios</h1>
      <p className="subtitle">Upload your Excel DRG and let AI generate your API test scenarios instantly.</p>

      <div className="glass-panel" style={{ marginBottom: "2rem" }}>
        <div
          className={`upload-zone ${dragActive ? "drag-active" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
        >
          <div className="upload-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
            {file ? <strong style={{ color: "var(--accent-color)" }}>{file.name}</strong> : "Drag & Drop your Excel file here"}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>or click to browse files (.xlsx)</p>
          
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleChange}
            style={{ display: "none" }}
          />
        </div>

        {error && (
          <div style={{ marginTop: "1rem", color: "#ef4444", textAlign: "center", background: "rgba(239, 68, 68, 0.1)", padding: "0.75rem", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
          <button 
            className="btn" 
            onClick={handleGenerate} 
            disabled={!file || isLoading}
            style={{ width: "100%", maxWidth: "300px", fontSize: "1.1rem", padding: "1rem" }}
          >
            {isLoading ? (
              <>
                <div className="loader"></div>
                Analyzing DRG...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Generate Scenarios
              </>
            )}
          </button>
        </div>
      </div>

      {scenarios && (
        <div className="glass-panel" style={{ animation: "fadeIn 0.5s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "600" }}>Generated JSON</h2>
            <button className="btn" onClick={downloadJSON} style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download JSON
            </button>
          </div>
          
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ background: "rgba(34, 197, 94, 0.1)", color: "#4ade80", padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid rgba(34, 197, 94, 0.2)", fontSize: "0.9rem" }}>
              <strong>{scenarios.filter(s => s.type === "positive").length}</strong> Positive Scenarios
            </div>
            <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#f87171", padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)", fontSize: "0.9rem" }}>
              <strong>{scenarios.filter(s => s.type === "negative").length}</strong> Negative Scenarios
            </div>
          </div>

          <pre className="code-block">
            {JSON.stringify(scenarios, null, 2)}
          </pre>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
