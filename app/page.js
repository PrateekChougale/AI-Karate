"use client";

import { useState, useRef } from "react";
import * as xlsx from "xlsx";

export default function Home() {
  const [file, setFile] = useState(null);
  const [excelData, setExcelData] = useState(null); // 2D array [ [col1, col2], [row1col1, row1col2] ]
  const [jsonPreferences, setJsonPreferences] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scenarios, setScenarios] = useState(null);
  const [error, setError] = useState(null);
  const [hasTemplate, setHasTemplate] = useState(false);
  const [templateFile, setTemplateFile] = useState(null);
  const [templateContent, setTemplateContent] = useState("");
  const inputRef = useRef(null);
  const templateInputRef = useRef(null);

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
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleTemplateDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processTemplateFile(e.dataTransfer.files[0]);
    }
  };

  const handleTemplateChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processTemplateFile(e.target.files[0]);
    }
  };

  const processFile = (droppedFile) => {
    if (
      droppedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      droppedFile.type === "application/vnd.ms-excel" ||
      droppedFile.name.endsWith(".xlsx") ||
      droppedFile.name.endsWith(".xls")
    ) {
      setFile(droppedFile);
      setError(null);
      setScenarios(null);

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result;
          const workbook = xlsx.read(bstr, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
          
          // Ensure all rows have the same number of columns based on the longest row
          const maxCols = Math.max(...data.map(row => row.length), 0);
          const normalizedData = data.map(row => {
            const newRow = [...row];
            while (newRow.length < maxCols) newRow.push("");
            return newRow;
          });
          
          if (normalizedData.length === 0) {
            // Add a default header row if completely empty
            normalizedData.push(["Header 1"]);
          }

          setExcelData(normalizedData);
        } catch (e) {
          setError("Failed to parse Excel file.");
          console.error(e);
        }
      };
      reader.readAsBinaryString(droppedFile);
    } else {
      setError("Please upload a valid Excel file (.xlsx or .xls)");
    }
  };

  const processTemplateFile = (droppedFile) => {
    setTemplateFile(droppedFile);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        if (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls")) {
          const bstr = evt.target.result;
          const workbook = xlsx.read(bstr, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const csvStr = xlsx.utils.sheet_to_csv(worksheet);
          setTemplateContent(csvStr);
        } else {
          setTemplateContent(evt.target.result);
        }
      } catch (e) {
        setError("Failed to parse template file.");
        console.error(e);
      }
    };
    
    if (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls")) {
      reader.readAsBinaryString(droppedFile);
    } else {
      reader.readAsText(droppedFile);
    }
  };

  const onButtonClick = () => {
    inputRef.current.click();
  };

  const onTemplateButtonClick = () => {
    templateInputRef.current.click();
  };

  // Table Editing Functions
  const handleCellChange = (rowIndex, colIndex, value) => {
    const newData = [...excelData];
    newData[rowIndex][colIndex] = value;
    setExcelData(newData);
  };

  const addColumn = () => {
    const colName = prompt("Enter new column name (e.g., 'Validation Rule', 'Expected Output'):");
    if (!colName) return;

    const newData = excelData.map((row, rowIndex) => {
      const newRow = [...row];
      if (rowIndex === 0) {
        newRow.push(colName);
      } else {
        newRow.push(""); // empty string for data rows
      }
      return newRow;
    });
    setExcelData(newData);
  };

  const removeColumn = (colIndexToRemove) => {
    if (excelData[0].length <= 1) {
      alert("Cannot remove the last column.");
      return;
    }
    const newData = excelData.map(row => 
      row.filter((_, index) => index !== colIndexToRemove)
    );
    setExcelData(newData);
  };

  // Generate scenarios
  const handleGenerate = async () => {
    if (!excelData || excelData.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          excelData: excelData,
          jsonPreferences: jsonPreferences,
          templateContent: hasTemplate ? templateContent : null,
          templateFileName: hasTemplate && templateFile ? templateFile.name : null
        }),
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
      <p className="subtitle">Upload your Excel DRG, edit columns, and let AI generate your API test scenarios instantly.</p>

      <div className="glass-panel" style={{ marginBottom: "2rem" }}>
        {!excelData ? (
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
              "Drag & Drop your Excel file here"
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
        ) : (
          <div className="edit-zone" style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--accent-color)" }}>
                Data Preview & Edit: {file?.name}
              </h3>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-sm" onClick={() => setExcelData(null)} style={{ background: "rgba(255,255,255,0.1)" }}>
                  Change File
                </button>
                <button className="btn btn-sm" onClick={addColumn}>
                  + Add Column
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    {excelData[0].map((header, colIndex) => (
                      <th key={`header-${colIndex}`}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <input 
                            className="table-input header-input"
                            value={header}
                            onChange={(e) => handleCellChange(0, colIndex, e.target.value)}
                          />
                          <button 
                            className="col-action-btn delete-col"
                            onClick={() => removeColumn(colIndex)}
                            title="Remove column"
                          >
                            Remove
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {excelData.slice(1).map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                      {row.map((cell, colIndex) => (
                        <td key={`cell-${rowIndex}-${colIndex}`}>
                          <input 
                            className="table-input"
                            value={cell}
                            onChange={(e) => handleCellChange(rowIndex + 1, colIndex, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: "2rem" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: "500" }}>JSON Structure Preferences (Optional)</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Describe how you want the JSON payload to be structured (e.g., "nest 'age' under 'user' object", "use camelCase for all keys"). The AI will analyze the DRG and apply these rules.
              </p>
              <textarea 
                className="config-textarea"
                placeholder="e.g., The output should contain a root 'data' object..."
                value={jsonPreferences}
                onChange={(e) => setJsonPreferences(e.target.value)}
                rows={4}
              />
            </div>
            <div style={{ marginTop: "2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input 
                type="checkbox" 
                id="hasTemplate" 
                checked={hasTemplate} 
                onChange={(e) => setHasTemplate(e.target.checked)} 
                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--accent-color)" }}
              />
              <label htmlFor="hasTemplate" style={{ fontSize: "1.1rem", fontWeight: "500", cursor: "pointer" }}>
                Already have the template of datasheet?
              </label>
            </div>

            {hasTemplate && (
              <div style={{ marginTop: "1rem", animation: "fadeIn 0.3s ease" }}>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  Upload your template file (.xlsx, .csv, .json, .txt). The AI will map the DRG data into this template's format.
                </p>
                
                <div
                  className={`upload-zone ${dragActive ? "drag-active" : ""}`}
                  style={{ padding: "1.5rem", minHeight: "auto" }}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleTemplateDrop}
                  onClick={onTemplateButtonClick}
                >
                  <p style={{ fontSize: "1rem", marginBottom: "0" }}>
                    {templateFile ? <strong style={{ color: "var(--accent-color)" }}>{templateFile.name}</strong> : "Click or drag your template file here"}
                  </p>
                  
                  <input
                    ref={templateInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv, .json, .txt"
                    onChange={handleTemplateChange}
                    style={{ display: "none" }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ marginTop: "1rem", color: "#ef4444", textAlign: "center", background: "rgba(239, 68, 68, 0.1)", padding: "0.75rem", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            {error}
          </div>
        )}

        {excelData && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
            <button 
              className="btn" 
              onClick={handleGenerate} 
              disabled={isLoading}
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
        )}
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
