import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ConcernBadge, { CONCERN_CONFIG } from '../../components/RiskBadge.jsx';
import { SkeletonCard } from '../../components/SkeletonLoader.jsx';
import { useApplicationDetail, useApplicationVerification } from '../../hooks/useApplications.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

const statusLabels = { pending: 'Pending', under_review: 'Under Review', approved: 'Approved', rejected: 'Rejected', flagged: 'Verification Required' };
const verificationStatusLabels = {
  verified: 'Verification Passed',
  rejected: 'Verification Failed',
  pending_verification: 'Processing',
};
function date(value) { return value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; }
function shortDate(value) { return value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }

function getVerificationBadge(status, tamperingDetected, ocrMismatch) {
  if (status === 'verified') return <span className="status-badge approved">Verification Passed</span>;
  if (status === 'rejected') return <span className="status-badge rejected">Verification Failed</span>;
  if (tamperingDetected || ocrMismatch) return <span className="status-badge pending" style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>Verification Attention Required</span>;
  if (status === 'pending_verification') return <span className="status-badge pending">Processing</span>;
  return <span className="status-badge pending">Verification Inconclusive</span>;
}

export default function ApplicationDetail() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { application, loading, error, isFallback, updateStatus, verifyDocument, refetch: refetchApp } = useApplicationDetail(applicationId);
  const { data: verData, refetch: refetchVer } = useApplicationVerification(applicationId);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const isOfficer = user && ['admin', 'district_officer', 'verifying_officer'].includes(user.role);

  if (loading) return <div><SkeletonCard /><div style={{ height: 20 }} /><SkeletonCard /></div>;
  if (!application) return <div className="empty-state"><div className="empty-state-icon">📋</div><h3>Application not found</h3><p>{error || 'This application is unavailable.'}</p><button className="btn btn-secondary" onClick={() => navigate('/applications')}>Back to Applications</button></div>;

  async function action(newStatus, promptMessage) {
    let note = '';
    if (newStatus === 'rejected') {
      const reasonInput = window.prompt('Please provide the official reason for rejecting this application:', 'Document or demographic mismatch detected during review');
      if (reasonInput === null) return;
      note = reasonInput || 'Rejected during officer review';
    } else {
      if (!window.confirm(promptMessage)) return;
      note = promptMessage;
    }
    setBusy(true);
    setNotice('');
    try {
      const result = await updateStatus(newStatus, note);
      await Promise.all([refetchApp(), refetchVer()]);
      if (result.success && !result.isMock) {
        setNotice(`✓ Application status successfully updated to "${statusLabels[newStatus] || newStatus}".`);
      } else if (result.error) {
        setNotice(`⚠️ ${result.error}`);
      } else {
        setNotice(`Application status updated to ${statusLabels[newStatus] || newStatus}.`);
      }
    } catch (err) {
      setNotice(`⚠️ Failed to update application: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }
  async function verify(document, status) {
    let reason = '';
    if (status === 'rejected') reason = window.prompt('Reason for rejecting this document:', '') || '';
    setBusy(true);
    const result = await verifyDocument(document.id, status, reason);
    await Promise.all([refetchApp(), refetchVer()]);
    setBusy(false);
    setNotice(result.isMock ? 'Updated locally.' : `Document ${status} successfully.`);
  }

  return <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
      <button className="btn btn-secondary btn-sm" onClick={() => navigate('/applications')}>← Applications</button>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => { const blob = new Blob([JSON.stringify(application, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${application.application_id}.json`; link.click(); URL.revokeObjectURL(url); }}>↓ Download Application</button>
        <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>⎙ Print Application</button>
      </div>
    </div>
    {isFallback && <div className="alert-red" style={{ marginBottom: 16 }}>🔴 Backend unavailable · Live data cannot be displayed</div>}
    {notice && <div className="alert-green" style={{ marginBottom: 16 }}>{notice}</div>}

    <div className="profile-card" style={{ marginBottom: 20 }}>
      <div className="profile-avatar">{application.beneficiary_name.split(' ').slice(0, 2).map(word => word[0]).join('')}</div>
      <div className="profile-info" style={{ flex: 1 }}>
        <h2>{application.beneficiary_name}</h2>
        <p>{application.application_id} · {application.scheme_name}</p>
        <div className="profile-meta">
          <span className="meta-chip">📍 {application.district}, {application.state}</span>
          <span className="meta-chip">📅 {shortDate(application.application_date)}</span>
          <span className={`status-badge ${application.status === 'approved' ? 'approved' : application.status === 'rejected' ? 'rejected' : application.status === 'under_review' || application.status === 'flagged' ? 'flagged' : 'pending'}`}>{statusLabels[application.status] || application.status}</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 34, fontWeight: 900, color: CONCERN_CONFIG[application.concern_level]?.color }}>{Math.round(application.leakage_probability || 0)}%</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>AI LEAKAGE PROBABILITY</div>
        <ConcernBadge level={application.concern_level} size="lg" />
      </div>
    </div>

    <div className="grid grid-2" style={{ marginBottom: 20 }}>
      <section className="card">
        <div className="card-title" style={{ marginBottom: 14 }}>Applicant Information</div>
        {[['Name', application.beneficiary_name], ['Beneficiary ID', `#${application.beneficiary_id}`], ['Age / Gender', `${application.age || '—'} · ${application.gender}`], ['Mobile', application.mobile], ['Address', application.address || 'Protected record'], ['Income', `₹${Number(application.annual_income || 0).toLocaleString('en-IN')}`], ['Family Size', application.family_size]].map(([label, value]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 12 }}><span style={{ color: 'var(--text-muted)' }}>{label}</span><strong>{value}</strong></div>)}
      </section>
      <section className="card">
        <div className="card-title" style={{ marginBottom: 14 }}>Scheme Information</div>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>{application.scheme_name}</h3>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>{application.scheme_description}</p>
        {[['Scheme ID', application.scheme_id], ['Eligibility', application.eligibility_status === 'eligible' ? 'Eligible' : 'Needs Review'], ['Benefit', `₹${Number(application.benefit_amount || 0).toLocaleString('en-IN')}`], ['Application Date', shortDate(application.application_date)]].map(([label, value]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 12 }}><span style={{ color: 'var(--text-muted)' }}>{label}</span><strong>{value}</strong></div>)}
      </section>
    </div>

    <section className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <div>
          <div className="card-title">Submitted Documents</div>
          <div className="card-subtitle">Documents uploaded by applicant</div>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        {(application.documents || []).length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
            No documents have been uploaded for this application yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(application.documents || []).map(document => {
              const forensics = document.forensics || {};
              const ocrData = document.ocr_extracted || {};
              const tamperingDetected = forensics.tampering_detected || document.tampering_detected || false;
              const ocrMismatch = ocrData.mismatch_detected || false;
              const inconsistencies = ocrData.mismatch_fields || [];
              const confidence = forensics.confidence || document.confidence || 0;
              const modelVersion = forensics.model_version || document.model_version || 'casia-document-forensics-v1';
              const docHash = document.sha256_hash || 'SHA-256 calculated on upload';
              const ocrStatus = ocrData.raw_text ? 'OCR Extracted' : 'OCR Processed';
              const verificationStatus = document.verification_status || 'pending_verification';
              const verifiedAt = document.verified_at || document.uploaded_at;

              return (
                <div key={document.id} style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{document.document_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{document.doc_type || document.document_type}</div>
                    </div>
                    {getVerificationBadge(verificationStatus, tamperingDetected, ocrMismatch)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 12 }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Upload Date</span><div style={{ fontWeight: 600 }}>{date(document.uploaded_at)}</div></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Verification Status</span><div style={{ fontWeight: 600 }}>{verificationStatusLabels[verificationStatus] || verificationStatus}</div></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>AI Confidence</span><div style={{ fontWeight: 600 }}>{Math.round(confidence * 100)}%</div></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Tampering Assessment</span><div style={{ fontWeight: 600, color: tamperingDetected ? 'var(--red-500)' : 'var(--green-500)' }}>{tamperingDetected ? 'Tampering Detected' : 'No Tampering Detected'}</div></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>OCR Status</span><div style={{ fontWeight: 600 }}>{ocrStatus}</div></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Detected Inconsistencies</span><div style={{ fontWeight: 600, color: inconsistencies.length > 0 ? 'var(--amber-500)' : 'var(--green-500)' }}>{inconsistencies.length > 0 ? inconsistencies.join(', ') : 'None detected'}</div></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Document Hash</span><div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>{typeof docHash === 'string' && docHash.length > 24 ? `${docHash.slice(0, 24)}...` : docHash}</div></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>AI Model Version</span><div style={{ fontWeight: 600 }}>{modelVersion}</div></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Verification Timestamp</span><div style={{ fontWeight: 600 }}>{date(verifiedAt)}</div></div>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {document.view_url && !document.is_demo && (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => window.open(document.view_url, '_blank')}>View Document</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => { const a = document.createElement('a'); a.href = document.download_url; a.download = document.original_filename || document.document_name; a.click(); }}>Download</button>
                      </>
                    )}
                    {verificationStatus !== 'verified' && (
                      <button className="btn btn-success btn-sm" disabled={busy} onClick={() => verify(document, 'verified')}>✓ Verify Document</button>
                    )}
                    {verificationStatus !== 'rejected' && (
                      <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => verify(document, 'rejected')}>✗ Reject Document</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>

    {/* SCHEME REQUIRED DOCUMENTS CHECKLIST */}
    {verData?.requiredChecklist?.length > 0 && (
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Scheme Document Checklist</div>
            <div className="card-subtitle">Mandatory documents required for {application.scheme_name}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 14 }}>
          {verData.requiredChecklist.map(item => (
            <div key={item.type} style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.required ? 'Mandatory' : 'Optional'}</div>
              </div>
              <span className={`status-badge ${item.uploaded ? 'approved' : 'pending'}`}>
                {item.uploaded ? '✓ Uploaded' : '⏳ Pending'}
              </span>
            </div>
          ))}
        </div>
      </section>
    )}

    {/* CROSS-DOCUMENT CONSISTENCY ANALYSIS */}
    {verData?.crossDocumentComparisons?.length > 0 && (
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="card-title">Cross-Document Consistency Analysis</div>
            <div className="card-subtitle">Automated pairwise cross-verification of demographic and identity fields</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/ai/document-verifier')}>
            🔬 Open Document Testing Lab
          </button>
        </div>
        <div className="table-container" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Document A Value</th>
                <th>Document B Value</th>
                <th>Status</th>
                <th>Similarity</th>
                <th>Analysis Reason</th>
              </tr>
            </thead>
            <tbody>
              {verData.crossDocumentComparisons.map((cmp, idx) => {
                const isConsistent = cmp.status === 'CONSISTENT';
                const isMismatch = cmp.status === 'MISMATCH';
                return (
                  <tr key={`${cmp.field}-${idx}`}>
                    <td><strong>{cmp.field}</strong></td>
                    <td>
                      <div>{cmp.doc_a_value}</div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{cmp.doc_a_name}</span>
                    </td>
                    <td>
                      <div>{cmp.doc_b_value}</div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{cmp.doc_b_name}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${isConsistent ? 'approved' : isMismatch ? 'rejected' : 'pending'}`}>
                        {isConsistent ? '✓ Consistent' : isMismatch ? '✗ Mismatch' : '⚠ Partial Mismatch'}
                      </span>
                    </td>
                    <td>{Math.round((cmp.similarity || 0) * 100)}%</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{cmp.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    )}

    {/* AI VERIFICATION SUMMARY */}
    {verData && (
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="card-title">AI Verification Decision & Signal Breakdown</div>
            <span className={`status-badge ${verData.overallVerificationVerdict === 'VERIFIED' ? 'approved' : verData.overallVerificationVerdict === 'MISMATCH' || verData.overallVerificationVerdict === 'SUSPICIOUS' ? 'rejected' : 'pending'}`}>
              {verData.overallVerificationVerdict === 'VERIFIED' ? '🛡️ VERIFIED' : verData.overallVerificationVerdict === 'MISMATCH' ? '⚠️ MISMATCH DETECTED' : verData.overallVerificationVerdict === 'SUSPICIOUS' ? '🚨 SUSPICIOUS RECORD' : verData.overallVerificationVerdict}
            </span>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 16 }}>
            {Object.entries(verData.signals || {}).map(([sigKey, sigVal]) => (
              <div key={sigKey} style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{sigKey.replace('_', ' ')}</div>
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: sigVal === 'consistent' || sigVal === 'authentic' || sigVal === 'none' ? 'var(--green-500)' : sigVal === 'partial_mismatch' ? 'var(--amber-500)' : 'var(--red-500)' }}>
                  {sigVal.replace('_', ' ').toUpperCase()}
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--bg-elevated)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <strong style={{ fontSize: 13 }}>AI Verification Reasons:</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)' }}>
              {(verData.reasons || []).map((r, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    )}

    <div className="grid grid-2" style={{ marginBottom: 20 }}>
      <section className="card">
        <div className="card-title" style={{ marginBottom: 14 }}>Application History</div>
        {(application.history || []).map((item, index) => <div key={`${item.status}-${index}`} style={{ display: 'flex', gap: 12, paddingBottom: 14 }}><div style={{ width: 10, height: 10, marginTop: 5, borderRadius: '50%', background: index === application.history.length - 1 ? 'var(--blue-400)' : 'var(--green-500)', flexShrink: 0 }} /><div><strong style={{ fontSize: 13 }}>{item.note}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{shortDate(item.created_at)}</div></div></div>)}
      </section>
      <section className="card">
        <div className="card-title" style={{ marginBottom: 14 }}>AI Leakage Analysis</div>
        <ConcernBadge level={application.concern_level} size="lg" />
        <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>{application.concern_level === 'low' ? 'No strong signal detected' : 'Why was this application flagged?'}</h3>
        <ul style={{ paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 12 }}>
          {(application.flagged_reasons?.length ? application.flagged_reasons : ['No strong anomalies detected in the available records.']).map(reason => <li key={reason} style={{ marginBottom: 7 }}>{reason}</li>)}
        </ul>
        <div className="alert-blue" style={{ marginTop: 14, fontSize: 12 }}>
          <strong>Recommended Action</strong><br />
          {application.recommended_action}<br />
          <span style={{ color: 'var(--text-muted)' }}>Advisory only. An authorized officer makes the final decision.</span>
        </div>
      </section>
    </div>

    {isOfficer ? (
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div className="card-title" style={{ margin: 0 }}>Officer Adjudication & Decision Controls</div>
            <div className="card-subtitle">Official actions logged into government audit trail</div>
          </div>
          <span className="meta-chip" style={{ textTransform: 'uppercase', color: 'var(--text-accent)' }}>
            👤 Role: {user?.role?.replace('_', ' ')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/applications/${applicationId}/verification`)}
          >
            🔍 AI Verification Report
          </button>
          <button
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={() => action('under_review', 'Request additional document verification from applicant?')}
          >
            📋 Request Verification
          </button>
          <button
            className="btn btn-success btn-sm"
            disabled={busy}
            onClick={() => action('approved', 'Approve this welfare application for benefit disbursement?')}
          >
            ✓ Approve Application
          </button>
          <button
            className="btn btn-danger btn-sm"
            disabled={busy}
            onClick={() => action('rejected', 'Reject this welfare application?')}
          >
            ✗ Reject Application
          </button>
          <button
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={() => action('under_review', 'Place this application on hold for manual inquiry?')}
          >
            ⏸ Put On Hold
          </button>
          <button
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={() => action('flagged', 'Flag this application for AI anomaly investigation?')}
          >
            🚩 Flag for Investigation
          </button>
        </div>
      </div>
    ) : (
      <div className="card" style={{ borderLeft: '4px solid var(--blue-500)' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div className="card-title" style={{ margin: 0 }}>Application Status & Tracking</div>
            <div className="card-subtitle">Your application is being processed by the district welfare department</div>
          </div>
          <span className={`status-badge ${application.status === 'approved' ? 'approved' : application.status === 'rejected' ? 'rejected' : 'pending'}`}>
            {statusLabels[application.status] || application.status}
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 16px' }}>
          {application.status === 'approved'
            ? '🎉 Congratulations! Your application has been approved. Benefit disbursements will be credited to your verified bank account.'
            : application.status === 'rejected'
            ? 'Your application was not approved during officer verification. You may review the AI report or submit a grievance.'
            : 'Your submitted records and documents are currently under review by verification officers. Official decisions require authorized officer review.'}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/applications/${applicationId}/verification`)}
          >
            🛡️ View AI Verification Report
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/complaints')}
          >
            📢 Grievance / Inquire
          </button>
        </div>
      </div>
    )}
  </div>;
}