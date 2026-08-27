/**
 * SchemeSecure AI — Claims & Application Audit Controller
 */

let currentApplications = [];
let activeApplicationId = null;

async function loadClaims() {
  const loading = document.getElementById("claims-loading");
  const tbody = document.getElementById("claims-tbody");
  if (loading) loading.style.display = "block";

  const search = document.getElementById("claims-search-input")?.value || '';
  const status = document.getElementById("claims-status-filter")?.value || 'all';
  const concern = document.getElementById("claims-concern-filter")?.value || 'all';

  try {
    const params = {
      search,
      application_status: status !== 'all' ? status : undefined,
      concern_level: concern !== 'all' ? concern : undefined,
      limit: 50
    };

    const res = await api.applications.getAll(params);
    currentApplications = res.items || res || [];
    renderClaimsTable(currentApplications);
  } catch (error) {
    showToast("Failed to load claims: " + error.message, "error");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--text-muted);">Failed to load claims. Verify backend connection.</td></tr>`;
    }
  } finally {
    if (loading) loading.style.display = "none";
  }
}

function renderClaimsTable(applications) {
  const tbody = document.getElementById("claims-tbody");
  if (!tbody) return;

  if (applications.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:48px 16px; color:var(--text-muted);">
          No applications or claims matched the selected filters.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = applications.map(app => {
    const score = Math.round((app.ai_risk_score ?? (app.ai_prediction?.leakage_probability || 0)) * 100);
    const badgeClass = score >= 85 ? 'badge-critical' : score >= 60 ? 'badge-high' : score >= 30 ? 'badge-moderate' : 'badge-low';
    const levelLabel = score >= 85 ? 'Critical' : score >= 60 ? 'High' : score >= 30 ? 'Moderate' : 'Low';
    
    const statusClass = `badge-${app.status || 'pending'}`;
    const dateStr = app.created_at ? new Date(app.created_at).toLocaleDateString() : 'Recent';

    return `
      <tr>
        <td style="font-weight:600; font-family:monospace; color:var(--text-secondary);">#${app.application_number || app.id}</td>
        <td>
          <div style="font-weight:600;">${app.beneficiary_name || ('Beneficiary #' + app.beneficiary_id)}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${app.district_name || 'District ' + (app.district_id || 1)}</div>
        </td>
        <td style="font-size:0.875rem;">${app.scheme_name || ('Scheme #' + app.scheme_id)}</td>
        <td>
          <span class="badge ${badgeClass}">${score}% • ${levelLabel}</span>
        </td>
        <td>
          <span class="badge ${statusClass}">${(app.status || 'pending').toUpperCase()}</span>
        </td>
        <td style="color:var(--text-muted); font-size:0.85rem;">${dateStr}</td>
        <td>
          <button onclick="openClaimModal(${app.id})" class="btn btn-sm btn-outline">
            Audit AI Evidence
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function openClaimModal(applicationId) {
  activeApplicationId = applicationId;
  const modal = document.getElementById("claim-audit-modal");
  const modalBody = document.getElementById("claim-modal-body");
  if (!modal || !modalBody) return;

  modalBody.innerHTML = `<div style="text-align:center; padding:32px;">Loading AI risk evaluation...</div>`;
  modal.classList.add("active");

  try {
    const app = await api.applications.getById(applicationId);
    if (!app) throw new Error("Application details not found");

    const score = Math.round((app.ai_risk_score ?? (app.ai_prediction?.leakage_probability || 0)) * 100);
    const badgeClass = score >= 85 ? 'badge-critical' : score >= 60 ? 'badge-high' : score >= 30 ? 'badge-moderate' : 'badge-low';
    const levelLabel = score >= 85 ? 'Critical' : score >= 60 ? 'High' : score >= 30 ? 'Moderate' : 'Low';

    // Parse AI Evidence
    let evidence = app.ai_evidence || app.ai_prediction?.evidence || [];
    if (typeof evidence === 'string') {
      try { evidence = JSON.parse(evidence); } catch { evidence = [evidence]; }
    }

    modalBody.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
        <div>
          <h3 style="font-size:1.3rem; margin-bottom:4px;">${app.beneficiary_name || 'Beneficiary #' + app.beneficiary_id}</h3>
          <div style="color:var(--text-secondary); font-size:0.875rem;">
            Application ID: <span style="font-family:monospace; color:#fff;">#${app.application_number || app.id}</span> • 
            Scheme: <span style="color:#60a5fa;">${app.scheme_name || 'Scheme #' + app.scheme_id}</span>
          </div>
        </div>
        <div style="text-align:right;">
          <span class="badge ${badgeClass}" style="font-size:0.9rem; padding:6px 12px;">
            ${score}% Leakage Risk (${levelLabel})
          </span>
        </div>
      </div>

      <!-- Risk Meter Bar -->
      <div style="margin-bottom:20px; background:var(--bg-surface); padding:16px; border-radius:var(--radius-md); border:1px solid var(--border-color);">
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:8px;">
          <span style="font-weight:600;">AI Leakage Advisory Score</span>
          <span>${score} / 100</span>
        </div>
        <div style="height:10px; border-radius:var(--radius-full); background:rgba(255,255,255,0.1); overflow:hidden;">
          <div style="height:100%; width:${score}%; background:${score >= 85 ? 'var(--risk-critical)' : score >= 60 ? 'var(--risk-high)' : score >= 30 ? 'var(--risk-moderate)' : 'var(--risk-low)'};"></div>
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:8px;">
          Advisory note: All AI risk indicators are recommendations for authorized reviewing officers.
        </div>
      </div>

      <!-- AI Evidence & Findings Checklist -->
      <div style="margin-bottom:24px;">
        <h4 style="font-size:0.95rem; margin-bottom:10px; color:#fff;">Anomaly Detection Evidence</h4>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="padding:10px 14px; border-radius:var(--radius-sm); background:var(--bg-card); border:1px solid ${app.aadhaar_duplicate ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}; display:flex; justify-content:space-between; align-items:center;">
            <span>Aadhaar Multi-Claim Duplicate Check</span>
            <span class="badge ${app.aadhaar_duplicate ? 'badge-critical' : 'badge-low'}">${app.aadhaar_duplicate ? 'DUPLICATE DETECTED' : 'CLEAN / UNIQUE'}</span>
          </div>
          <div style="padding:10px 14px; border-radius:var(--radius-sm); background:var(--bg-card); border:1px solid ${app.mobile_duplicate ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}; display:flex; justify-content:space-between; align-items:center;">
            <span>Mobile Number Multi-Registration Check</span>
            <span class="badge ${app.mobile_duplicate ? 'badge-moderate' : 'badge-low'}">${app.mobile_duplicate ? 'SHARED MOBILE' : 'CLEAN'}</span>
          </div>
          <div style="padding:10px 14px; border-radius:var(--radius-sm); background:var(--bg-card); border:1px solid ${app.document_mismatch ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}; display:flex; justify-content:space-between; align-items:center;">
            <span>Document Authenticity & OCR Consistency</span>
            <span class="badge ${app.document_mismatch ? 'badge-critical' : 'badge-low'}">${app.document_mismatch ? 'MISMATCH FLAGGED' : 'VERIFIED MATCH'}</span>
          </div>
        </div>
      </div>

      <!-- Officer Decision Action Panel -->
      <div style="background:var(--bg-surface); padding:16px; border-radius:var(--radius-md); border:1px solid var(--border-light);">
        <h4 style="font-size:0.95rem; margin-bottom:10px;">Officer Action & Decision</h4>
        <div style="margin-bottom:12px;">
          <input id="claim-officer-note" type="text" class="form-input no-icon" placeholder="Optional audit note or field investigation reason...">
        </div>
        <div style="display:flex; gap:10px; justify-content:flex-end;">
          <button onclick="updateClaimStatus('flagged')" class="btn btn-sm btn-outline" style="color:var(--accent-amber); border-color:var(--accent-amber);">
            🚩 Flag for Investigation
          </button>
          <button onclick="updateClaimStatus('rejected')" class="btn btn-sm btn-danger">
            ✕ Reject Claim
          </button>
          <button onclick="updateClaimStatus('approved')" class="btn btn-sm btn-emerald">
            ✓ Approve Benefit
          </button>
        </div>
      </div>
    `;
  } catch (error) {
    modalBody.innerHTML = `<div style="color:var(--accent-rose); padding:24px;">Failed to load application: ${error.message}</div>`;
  }
}

async function updateClaimStatus(newStatus) {
  if (!activeApplicationId) return;

  const noteInput = document.getElementById("claim-officer-note");
  const note = noteInput?.value || `Decision marked as ${newStatus} by officer.`;

  try {
    await api.applications.updateStatus(activeApplicationId, newStatus, note);
    showToast(`Claim status updated to ${newStatus.toUpperCase()}`, "success");
    closeModal("claim-audit-modal");
    loadClaims();
  } catch (error) {
    showToast(error.message || "Failed to update claim status", "error");
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

document.addEventListener("DOMContentLoaded", () => {
  loadClaims();
});
