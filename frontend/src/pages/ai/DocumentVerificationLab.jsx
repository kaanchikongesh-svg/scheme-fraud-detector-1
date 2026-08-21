import { useState, useEffect, useRef } from 'react';
import api from '../../lib/api.js';

export default function DocumentVerificationLab() {
  const [activeTab, setActiveTab] = useState('samples'); // 'samples' | 'upload'
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('perfect_match');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState('');
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [filterField, setFilterField] = useState('all');

  // Custom upload state
  const [customFiles, setCustomFiles] = useState([
    { id: 'doc_1', file: null, docType: 'identity_proof', previewUrl: '' },
    { id: 'doc_2', file: null, docType: 'income_certificate', previewUrl: '' },
  ]);

  const fileInputRefs = useRef({});

  // Load scenarios on mount
  useEffect(() => {
    async function loadScenarios() {
      try {
        const data = await api.get('/api/v1/documents/test-samples');
        setScenarios(data || []);
      } catch (err) {
        console.error('Failed to load test scenarios:', err);
      }
    }
    loadScenarios();
    // Run default sample scenario on mount
    runScenarioTest('perfect_match');
  }, []);

  async function runScenarioTest(scenarioId) {
    setLoading(true);
    setError('');
    setSelectedScenarioId(scenarioId);
    try {
      const res = await api.post(`/api/v1/documents/ai-test-sample/${scenarioId}`);
      setTestResult(res);
      setSelectedDocIndex(0);
    } catch (err) {
      setError(err.message || 'Failed to execute scenario test.');
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const updated = [...customFiles];
    updated[index].file = file;
    updated[index].previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
    setCustomFiles(updated);
  };

  const handleDocTypeChange = (index, docType) => {
    const updated = [...customFiles];
    updated[index].docType = docType;
    setCustomFiles(updated);
  };

  const addCustomDocSlot = () => {
    if (customFiles.length >= 5) return;
    const nextIdx = customFiles.length + 1;
    setCustomFiles([
      ...customFiles,
      { id: `doc_${nextIdx}`, file: null, docType: nextIdx === 3 ? 'address_proof' : 'bank_passbook', previewUrl: '' }
    ]);
  };

  const removeCustomDocSlot = (index) => {
    if (customFiles.length <= 2) return;
    const updated = customFiles.filter((_, idx) => idx !== index);
    setCustomFiles(updated);
  };

  async function handleRunCustomTest(e) {
    if (e) e.preventDefault();
    const validFiles = customFiles.filter(item => item.file !== null);
    if (validFiles.length < 2) {
      setError('Please select at least 2 documents to perform Cross-Document Mismatch Detection.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      validFiles.forEach(item => {
        formData.append('files', item.file);
        formData.append('doc_types', item.docType);
      });

      const res = await api.upload('/api/v1/documents/ai-test', formData);
      setTestResult(res);
      setSelectedDocIndex(0);
    } catch (err) {
      setError(err.message || 'Failed to run document verification on uploaded files.');
    } finally {
      setLoading(false);
    }
  }

  const getVerdictMeta = (verdict) => {
    switch (verdict) {
      case 'VERIFIED':
        return {
          title: 'All Documents Verified & Authentic',
          badgeClass: 'approved',
          badgeText: '🛡️ VERIFIED (PASSED)',
          color: 'var(--green-500)',
          desc: 'All submitted identity, income, address, and contact fields match across documents without discrepancies.',
        };
      case 'MISMATCH':
        return {
          title: 'Cross-Document Discrepancy Detected',
          badgeClass: 'pending',
          badgeText: '⚠️ MISMATCH DETECTED',
          color: 'var(--amber-500)',
          desc: 'One or more demographic fields (Name, Income, Address, DOB, or Phone) show conflicting values across submitted documents.',
        };
      case 'SUSPICIOUS':
        return {
          title: 'Forensics Alert / Tampering Detected',
          badgeClass: 'rejected',
          badgeText: '🚨 SUSPICIOUS (FLAGGED)',
          color: 'var(--red-500)',
          desc: 'AI image forensics identified digital manipulation, noise variance, or duplicate document hashes in the registry.',
        };
      default:
        return {
          title: 'Evaluating Documents',
          badgeClass: 'pending',
          badgeText: '⏳ PROCESSING',
          color: 'var(--blue-400)',
          desc: 'Automated OCR extraction and pairwise analysis running.',
        };
    }
  };

  const exportDossierJSON = () => {
    if (!testResult) return;
    const blob = new Blob([JSON.stringify(testResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_Verification_Dossier_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredComparisons = (testResult?.crossDocumentComparisons || []).filter(cmp => {
    if (filterField === 'all') return true;
    return cmp.field.toLowerCase().includes(filterField.toLowerCase());
  });

  const verdictMeta = testResult ? getVerdictMeta(testResult.overallVerificationVerdict) : null;

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', paddingBottom: 60 }}>
      {/* HEADER HERO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>🔬</span>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>AI Document Verification & Testing Lab</h1>
          </div>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14, maxWidth: 740 }}>
            Upload or select multi-document sets to test <strong>OCR text extraction</strong>, <strong>Name, Address, Income, DOB, and Phone comparisons</strong>, <strong>CASIA forensics</strong>, and <strong>Cross-Document Mismatch Detection</strong> in real time.
          </p>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
          <button
            className={`btn btn-sm ${activeTab === 'samples' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-sm)' }}
            onClick={() => setActiveTab('samples')}
          >
            🧪 Preloaded Test Suites
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-sm)', marginLeft: 6 }}
            onClick={() => setActiveTab('upload')}
          >
            📁 Custom Document Upload
          </button>
        </div>
      </div>

      {/* MODE 1: PRELOADED SCENARIO PICKER */}
      {activeTab === 'samples' && (
        <section className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="card-title" style={{ margin: 0 }}>
              Select a Curated AI Testing Scenario
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              1-Click instant testing of OCR and multi-signal comparison algorithms
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {scenarios.map(sc => {
              const isSelected = selectedScenarioId === sc.id;
              return (
                <div
                  key={sc.id}
                  onClick={() => runScenarioTest(sc.id)}
                  style={{
                    padding: 14,
                    background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-elevated)',
                    border: isSelected ? '2px solid var(--blue-500)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{sc.title}</span>
                    <span className={`status-badge ${sc.badgeType === 'success' ? 'approved' : sc.badgeType === 'danger' ? 'rejected' : 'pending'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                      {sc.badge}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 8px', lineHeight: 1.4 }}>
                    {sc.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>📄 {sc.documentCount} Documents</span>
                    <span style={{ color: isSelected ? 'var(--blue-400)' : 'var(--text-secondary)', fontWeight: 600 }}>
                      {isSelected ? '▶ Active Test' : 'Click to Test →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* MODE 2: CUSTOM DOCUMENT UPLOAD DROPZONE */}
      {activeTab === 'upload' && (
        <section className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div className="card-title" style={{ margin: 0 }}>Custom Multi-Document Upload & Test</div>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                Upload 2 to 5 document files (PDF, PNG, JPG). RapidOCR will extract all text and execute pairwise consistency checks.
              </p>
            </div>
            {customFiles.length < 5 && (
              <button className="btn btn-secondary btn-sm" onClick={addCustomDocSlot}>
                + Add Another Document
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 20 }}>
            {customFiles.map((slot, index) => (
              <div
                key={slot.id}
                style={{
                  padding: 16,
                  background: 'var(--bg-elevated)',
                  border: slot.file ? '1px solid var(--green-500)' : '1px dashed var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-accent)' }}>
                    Document #{index + 1}
                  </span>
                  {customFiles.length > 2 && (
                    <button
                      onClick={() => removeCustomDocSlot(index)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--red-400)', cursor: 'pointer', fontSize: 14 }}
                      title="Remove slot"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Document Type
                  </label>
                  <select
                    className="form-input"
                    style={{ fontSize: 12, padding: '6px 8px' }}
                    value={slot.docType}
                    onChange={(e) => handleDocTypeChange(index, e.target.value)}
                  >
                    <option value="identity_proof">Identity Proof (Aadhaar / Voter ID / PAN)</option>
                    <option value="income_certificate">Income Certificate</option>
                    <option value="address_proof">Address Proof / Smart Ration Card</option>
                    <option value="bank_passbook">Bank Passbook</option>
                    <option value="community_certificate">Community Certificate</option>
                    <option value="land_record">Land Record / Patta</option>
                  </select>
                </div>

                <input
                  type="file"
                  accept="image/png, image/jpeg, application/pdf"
                  ref={el => fileInputRefs.current[index] = el}
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileChange(index, e)}
                />

                <div
                  onClick={() => fileInputRefs.current[index]?.click()}
                  style={{
                    padding: 16,
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'center',
                    background: slot.file ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg-card)',
                    cursor: 'pointer',
                  }}
                >
                  {slot.file ? (
                    <div>
                      <div style={{ fontSize: 24 }}>📄</div>
                      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, wordBreak: 'break-word' }}>{slot.file.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{(slot.file.size / 1024).toFixed(1)} KB · Click to replace</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 24, opacity: 0.6 }}>📤</div>
                      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>Click to Upload File</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>PDF, PNG, JPG (Max 10MB)</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              className="btn btn-primary"
              onClick={handleRunCustomTest}
              disabled={loading}
              style={{ minWidth: 200, padding: '10px 24px', fontSize: 14, fontWeight: 700 }}
            >
              {loading ? '🔍 Running AI OCR & Analysis...' : '⚡ Run AI Cross-Document Analysis'}
            </button>
          </div>
        </section>
      )}

      {/* ERROR ALERT */}
      {error && (
        <div className="alert-red" style={{ marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⚡</div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Executing Deep Learning OCR & Cross-Document Matrix...</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Extracting Name, DOB, Income, Address, Phone, Forensics & Generating Pairwise Comparisons</div>
        </div>
      )}

      {/* RESULTS DISPLAY */}
      {!loading && testResult && (
        <div>
          {/* VERDICT BANNER */}
          <div className="profile-card" style={{ marginBottom: 20, borderLeft: `6px solid ${verdictMeta.color}` }}>
            <div className="profile-avatar" style={{ background: verdictMeta.color }}>
              {testResult.overallVerificationVerdict === 'VERIFIED' ? '🛡️' : testResult.overallVerificationVerdict === 'MISMATCH' ? '⚠️' : '🚨'}
            </div>
            <div className="profile-info" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>{verdictMeta.title}</h2>
                <span className={`status-badge ${verdictMeta.badgeClass}`} style={{ fontSize: 12, padding: '4px 10px' }}>
                  {verdictMeta.badgeText}
                </span>
              </div>
              <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>
                {verdictMeta.desc}
              </p>
              <div className="profile-meta" style={{ marginTop: 10 }}>
                <span className="meta-chip">Total Documents Evaluated: {testResult.documentCount}</span>
                <span className="meta-chip">Pairwise Checks: {testResult.crossDocumentComparisons?.length || 0}</span>
                <span className="meta-chip">OCR Engine: RapidOCR / PyMuPDF</span>
                <span className="meta-chip">Forensics: CASIA Forensics v1</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '0 16px', borderLeft: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: verdictMeta.color }}>
                {Math.round(testResult.authenticityScore || 0)}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Authenticity Score
              </div>
            </div>
          </div>

          {/* MULTI-SIGNAL BREAKDOWN CARDS */}
          <section className="card" style={{ marginBottom: 20 }}>
            <div className="card-title" style={{ marginBottom: 14 }}>
              Multi-Signal Identity & Integrity Radar
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 10 }}>
              {testResult.signals && Object.entries(testResult.signals).map(([sigKey, sigVal]) => {
                const isGood = sigVal === 'consistent' || sigVal === 'authentic' || sigVal === 'none';
                const isPartial = sigVal === 'partial_mismatch';
                return (
                  <div
                    key={sigKey}
                    style={{
                      padding: '12px 10px',
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${isGood ? 'rgba(34, 197, 94, 0.2)' : isPartial ? 'rgba(234, 179, 8, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {sigKey.replace('_', ' ')}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        marginTop: 6,
                        color: isGood ? 'var(--green-500)' : isPartial ? 'var(--amber-500)' : 'var(--red-500)',
                      }}
                    >
                      {sigVal.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* PAIRWISE CROSS-DOCUMENT CONSISTENCY MATRIX */}
          <section className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div className="card-title" style={{ margin: 0 }}>
                Pairwise Cross-Document Consistency Matrix
              </div>

              {/* Field filter buttons */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['all', 'name', 'address', 'income', 'dob', 'phone'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterField(f)}
                    className={`btn btn-xs ${filterField === f ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ textTransform: 'capitalize', fontSize: 11 }}
                  >
                    {f === 'all' ? 'All Fields' : f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {filteredComparisons.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No comparisons found for the selected field filter.
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 140 }}>Evaluated Field</th>
                      <th>Document A</th>
                      <th>Document B</th>
                      <th style={{ width: 130 }}>Status</th>
                      <th style={{ width: 90 }}>Similarity</th>
                      <th>Analysis & Explainability Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComparisons.map((cmp, idx) => {
                      const isConsistent = cmp.status === 'CONSISTENT';
                      const isMismatch = cmp.status === 'MISMATCH';
                      return (
                        <tr key={`${cmp.field}-${idx}`}>
                          <td>
                            <strong>{cmp.field}</strong>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {cmp.doc_a_value || '—'}
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {cmp.doc_a_name}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {cmp.doc_b_value || '—'}
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {cmp.doc_b_name}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${isConsistent ? 'approved' : isMismatch ? 'rejected' : 'pending'}`}>
                              {isConsistent ? '✓ Consistent' : isMismatch ? '✗ Mismatch' : '⚠️ Partial'}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: isConsistent ? 'var(--green-400)' : isMismatch ? 'var(--red-400)' : 'var(--amber-400)' }}>
                              {Math.round((cmp.similarity || 0) * 100)}%
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {cmp.reason}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* OCR EXTRACTED FIELDS & RAW TEXT INSPECTOR */}
          <section className="card" style={{ marginBottom: 20 }}>
            <div className="card-title" style={{ marginBottom: 14 }}>
              OCR Extracted Field Inspector & Raw Stream
            </div>

            {/* Document Tabs */}
            <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10, marginBottom: 16, overflowX: 'auto' }}>
              {testResult.documents?.map((doc, idx) => (
                <button
                  key={doc.documentId}
                  className={`btn btn-sm ${selectedDocIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 12 }}
                  onClick={() => setSelectedDocIndex(idx)}
                >
                  📄 {doc.documentName} ({doc.documentType})
                </button>
              ))}
            </div>

            {testResult.documents && testResult.documents[selectedDocIndex] && (
              <div>
                {(() => {
                  const currentDoc = testResult.documents[selectedDocIndex];
                  const fields = currentDoc.extractedFields || {};
                  return (
                    <div>
                      {/* Field Tags Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                        <div style={{ padding: 10, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Applicant Name</span>
                          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: fields.name ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {fields.name || 'Not detected in OCR'}
                          </div>
                        </div>

                        <div style={{ padding: 10, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date of Birth</span>
                          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: fields.dob ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {fields.dob || 'Not detected in OCR'}
                          </div>
                        </div>

                        <div style={{ padding: 10, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Annual Income</span>
                          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: fields.income ? 'var(--green-400)' : 'var(--text-muted)' }}>
                            {fields.income ? `₹${Number(fields.income).toLocaleString('en-IN')}` : 'Not declared on doc'}
                          </div>
                        </div>

                        <div style={{ padding: 10, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone / Mobile</span>
                          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: fields.phone ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {fields.phone || 'Not detected in OCR'}
                          </div>
                        </div>

                        <div style={{ padding: 10, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>District / Jurisdiction</span>
                          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: fields.district ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {fields.district || 'Tamil Nadu'}
                          </div>
                        </div>

                        <div style={{ padding: 10, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ID / Certificate Number</span>
                          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: fields.id_number ? 'var(--text-accent)' : 'var(--text-muted)' }}>
                            {fields.id_number || 'Standard format'}
                          </div>
                        </div>
                      </div>

                      {/* Raw OCR Text Box */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                            Raw Extracted OCR Text Stream:
                          </span>
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => navigator.clipboard.writeText(currentDoc.rawText)}
                          >
                            📋 Copy Text
                          </button>
                        </div>
                        <pre
                          style={{
                            background: 'var(--bg-card)',
                            padding: 14,
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            whiteSpace: 'pre-wrap',
                            maxHeight: 180,
                            overflowY: 'auto',
                            fontFamily: 'monospace',
                          }}
                        >
                          {currentDoc.rawText || '(No text could be extracted from this document.)'}
                        </pre>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </section>

          {/* EXPLAINABLE OBSERVATIONS & EXPORT */}
          <section className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Export Verification Dossier</div>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                Download structured AI verification records, OCR field dumps, and similarity matrices for auditing.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                🖨️ Print Report
              </button>
              <button className="btn btn-primary btn-sm" onClick={exportDossierJSON}>
                📥 Export Dossier (JSON)
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
