import React, { useState } from 'react';
import './index.css';

function App() {
  const [file, setFile] = useState(null);
  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tableConfigs, setTableConfigs] = useState({});

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      const response = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setDocumentData(data);
        // Initialize table configs
        const configs = {};
        data.elements.forEach(el => {
          if (el.type === 'TABLE') {
            configs[el.tableID] = {
              tableID: el.tableID,
              activated: false,
              sortColumnIndex: 0,
              ascending: false
            };
          }
        });
        setTableConfigs(configs);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      alert('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  const updateTableConfig = (tableID, key, value) => {
    setTableConfigs(prev => ({
      ...prev,
      [tableID]: {
        ...prev[tableID],
        [key]: value
      }
    }));
  };

  const handleGeneratePdf = async () => {
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      const response = await fetch(`${baseUrl}/api/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: documentData.documentId,
          tableConfigs: Object.values(tableConfigs)
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${documentData.fileName}-polished.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to generate PDF');
      }
    } catch (err) {
      alert('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="app-header">
        <h1 className="app-title">Table Sorting</h1>
        <p className="app-subtitle">Upload your file, select the table(s) you want to sort, choose the column to classify with, and generate a sorted PDF.</p>
      </header>

      {!documentData ? (
        <div className="upload-section">
          <div className="upload-icon">📄</div>
          <h2>Upload your Document</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Supported formats: PDF, DOCX, XLSX, CSV, TXT, Images
          </p>
          <div className="file-input-wrapper">
            <button className="btn">
              {file ? file.name : 'Choose File'}
            </button>
            <input type="file" onChange={handleFileChange} />
          </div>
          <div style={{ marginTop: '2rem' }}>
            <button 
              className="btn" 
              onClick={handleUpload} 
              disabled={!file || loading}
              style={{ width: '100%' }}
            >
              {loading ? <span className="loader"></span> : 'Detect Tables'}
            </button>
          </div>
        </div>
      ) : (
        <div className="dashboard">
          <div className="dashboard-header">
            <div>
              <h2 style={{ color: 'white' }}>{documentData.fileName}</h2>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {documentData.elements.length} elements detected
              </span>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn" 
                style={{ background: 'transparent', border: '1px solid var(--accent-color)' }}
                onClick={() => { setDocumentData(null); setFile(null); setTableConfigs({}); }}
                disabled={loading}
              >
                Upload another file
              </button>
              <button className="btn" onClick={handleGeneratePdf} disabled={loading}>
                {loading ? <span className="loader"></span> : 'Return PDF with sorted tables'}
              </button>
            </div>
          </div>

          <div className="preview-container">
            {documentData.elements.map((el, i) => (
              <div key={i} className="element-card">
                {el.type === 'TEXT' ? (
                  <div className="text-chunk">
                    {el.lines.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </div>
                ) : (
                  <div className="table-chunk">
                    <div className="table-header-controls">
                      <div className="table-title">
                        📊 {el.tableID.replace('_', ' ')}
                      </div>
                      <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                        <div style={{ marginBottom: '0.8rem' }}>
                          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.1rem', fontWeight: 'bold' }}>
                            <input 
                              type="checkbox" 
                              style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
                              checked={tableConfigs[el.tableID]?.activated || false}
                              onChange={(e) => updateTableConfig(el.tableID, 'activated', e.target.checked)}
                            />
                            YES, I want to SORT this table
                          </label>
                        </div>
                        
                        {tableConfigs[el.tableID]?.activated && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '2.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>Which column to sort with?</span>
                            <select 
                              value={tableConfigs[el.tableID]?.sortColumnIndex || 0}
                              onChange={(e) => updateTableConfig(el.tableID, 'sortColumnIndex', parseInt(e.target.value))}
                              style={{ fontSize: '1rem', padding: '0.4rem', border: '1px solid var(--accent-color)' }}
                            >
                              {el.headers.map((h, idx) => (
                                <option key={idx} value={idx}>{h || `Column ${idx+1}`}</option>
                              ))}
                            </select>
                            
                            <select
                              value={tableConfigs[el.tableID]?.ascending ? 'asc' : 'desc'}
                              onChange={(e) => updateTableConfig(el.tableID, 'ascending', e.target.value === 'asc')}
                              style={{ fontSize: '1rem', padding: '0.4rem', border: '1px solid var(--accent-color)' }}
                            >
                              <option value="desc">Descending (Z to A / 9 to 1)</option>
                              <option value="asc">Ascending (A to Z / 1 to 9)</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="table-preview">
                      <table>
                        <thead>
                          <tr>
                            {el.headers.map((h, idx) => <th key={idx}>{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {el.rows.slice(0, 3).map((row, r_idx) => (
                            <tr key={r_idx}>
                              {row.map((cell, c_idx) => <td key={c_idx}>{cell}</td>)}
                            </tr>
                          ))}
                          {el.rows.length > 3 && (
                            <tr>
                              <td colSpan={el.headers.length} style={{ textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                ... {el.rows.length - 3} more rows
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
