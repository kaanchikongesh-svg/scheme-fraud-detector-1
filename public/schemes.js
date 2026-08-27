/**
 * SchemeSecure AI — Welfare Schemes Catalog Controller
 */

let allSchemes = [];
let allDistricts = [];

async function loadSchemes() {
  const container = document.getElementById("schemes-container");
  const loading = document.getElementById("schemes-loading");
  if (loading) loading.style.display = "block";

  try {
    const [schemes, districts] = await Promise.all([
      api.schemes.getAll(),
      api.districts.getAll().catch(() => [])
    ]);

    allSchemes = schemes || [];
    allDistricts = districts || [];
    
    // Populate Category filter dropdown
    populateCategories(allSchemes);
    
    // Populate District dropdown in apply modal
    populateDistrictOptions(allDistricts);

    // Initial render
    renderSchemes(allSchemes);
  } catch (error) {
    showToast("Failed to load schemes: " + error.message, "error");
    if (container) {
      container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:48px; color:var(--text-muted);">Failed to load schemes. Please ensure backend is running.</div>`;
    }
  } finally {
    if (loading) loading.style.display = "none";
  }
}

function populateCategories(schemes) {
  const select = document.getElementById("scheme-category-filter");
  if (!select) return;

  const categories = Array.from(new Set(schemes.map(s => s.category).filter(Boolean)));
  select.innerHTML = '<option value="all">All Categories</option>' + 
    categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

function populateDistrictOptions(districts) {
  const select = document.getElementById("apply-district-select");
  if (!select) return;

  select.innerHTML = '<option value="">Select District</option>' + 
    districts.map(d => `<option value="${d.id}">${d.name} (${d.state})</option>`).join('');
}

function filterSchemes() {
  const search = document.getElementById("scheme-search-input")?.value?.toLowerCase() || '';
  const category = document.getElementById("scheme-category-filter")?.value || 'all';

  const filtered = allSchemes.filter(scheme => {
    const matchSearch = !search || 
      scheme.name?.toLowerCase().includes(search) || 
      scheme.description?.toLowerCase().includes(search) ||
      scheme.category?.toLowerCase().includes(search);

    const matchCategory = category === 'all' || scheme.category === category;
    return matchSearch && matchCategory;
  });

  renderSchemes(filtered);
}

function renderSchemes(schemes) {
  const container = document.getElementById("schemes-container");
  if (!container) return;

  if (schemes.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 60px 20px; color: var(--text-muted);">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">🔍</div>
        <h3>No government schemes found</h3>
        <p>Try adjusting your search criteria or category filter.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = schemes.map(scheme => {
    const benefitFormatted = scheme.benefit_amount 
      ? `₹${scheme.benefit_amount.toLocaleString()}` 
      : 'Variable Subsidy';
      
    const reqDocsCount = scheme.required_documents?.length || 3;

    return `
      <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
            <span class="badge" style="background:rgba(37,99,235,0.15); color:#60a5fa; border:1px solid rgba(59,130,246,0.3);">
              ${scheme.category || 'Welfare Scheme'}
            </span>
            <span style="font-weight:700; color:var(--accent-emerald); font-size:1.1rem;">
              ${benefitFormatted}
            </span>
          </div>

          <h3 style="font-size:1.15rem; margin-bottom:8px; line-height:1.35;">${scheme.name}</h3>
          <p style="color:var(--text-secondary); font-size:0.875rem; margin-bottom:16px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">
            ${scheme.description || 'Government direct benefit transfer and social security welfare assistance.'}
          </p>
        </div>

        <div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:16px; display:flex; gap:12px;">
            <span>📄 ${reqDocsCount} Docs Required</span>
            <span>⚡ Direct Benefit Transfer</span>
          </div>

          <div style="display:flex; gap:8px;">
            <button onclick="viewSchemeDetails(${scheme.id})" class="btn btn-outline btn-sm" style="flex:1;">
              View Criteria
            </button>
            <button onclick="openApplyModal(${scheme.id})" class="btn btn-primary btn-sm" style="flex:1;">
              Apply Now
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function viewSchemeDetails(schemeId) {
  const scheme = allSchemes.find(s => s.id === schemeId);
  if (!scheme) return;

  const modal = document.getElementById("scheme-detail-modal");
  const body = document.getElementById("scheme-modal-body");
  if (!modal || !body) return;

  const criteria = scheme.eligibility_criteria || {};
  const criteriaList = [
    criteria.max_income ? `Annual Income Limit: ₹${criteria.max_income.toLocaleString()}` : null,
    criteria.min_age ? `Minimum Age: ${criteria.min_age} years` : null,
    criteria.max_age ? `Maximum Age: ${criteria.max_age} years` : null,
    criteria.gender ? `Gender Requirement: ${criteria.gender.toUpperCase()}` : null,
  ].filter(Boolean);

  body.innerHTML = `
    <div style="margin-bottom:16px;">
      <span class="badge" style="background:rgba(37,99,235,0.15); color:#60a5fa; margin-bottom:8px;">${scheme.category}</span>
      <h2 style="font-size:1.4rem; margin-top:6px;">${scheme.name}</h2>
      <div style="font-size:1.2rem; font-weight:700; color:var(--accent-emerald); margin:8px 0;">
        Benefit Amount: ₹${(scheme.benefit_amount || 0).toLocaleString()}
      </div>
      <p style="color:var(--text-secondary); line-height:1.6; margin-top:8px;">${scheme.description}</p>
    </div>

    <div style="margin-bottom:20px;">
      <h4 style="font-size:0.95rem; margin-bottom:8px; color:#fff;">Eligibility Criteria</h4>
      <ul style="list-style:inside disc; color:var(--text-secondary); font-size:0.875rem; line-height:1.6;">
        ${criteriaList.length > 0 ? criteriaList.map(c => `<li>${c}</li>`).join('') : '<li>Open to all eligible residents of India</li>'}
      </ul>
    </div>

    <div>
      <h4 style="font-size:0.95rem; margin-bottom:8px; color:#fff;">Required Supporting Documents</h4>
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${(scheme.required_documents || []).map(doc => `
          <div style="background:var(--bg-surface); padding:8px 12px; border-radius:var(--radius-sm); font-size:0.85rem; display:flex; justify-content:space-between;">
            <span>${doc.label || doc.type}</span>
            <span style="color:var(--accent-emerald); font-size:0.75rem;">${doc.required ? 'Mandatory' : 'Optional'}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  modal.classList.add("active");
}

function openApplyModal(schemeId) {
  const scheme = allSchemes.find(s => s.id === schemeId);
  if (!scheme) return;

  const modal = document.getElementById("apply-modal");
  const schemeNameEl = document.getElementById("apply-scheme-name");
  const schemeIdInput = document.getElementById("apply-scheme-id");

  if (schemeNameEl) schemeNameEl.textContent = scheme.name;
  if (schemeIdInput) schemeIdInput.value = scheme.id;

  if (modal) modal.classList.add("active");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

async function handleApplySubmit(event) {
  event.preventDefault();
  const schemeId = parseInt(document.getElementById("apply-scheme-id").value);
  const fullName = document.getElementById("apply-name").value;
  const aadhaar = document.getElementById("apply-aadhaar").value;
  const income = parseFloat(document.getElementById("apply-income").value || 0);
  const districtId = parseInt(document.getElementById("apply-district-select").value || 1);

  try {
    // 1. Register or find beneficiary
    const beneficiaryRes = await api.beneficiaries.create({
      full_name: fullName,
      raw_aadhaar: aadhaar,
      declared_income: income,
      district_id: districtId,
    });

    // 2. Submit application
    await api.applications.create({
      beneficiary_id: beneficiaryRes.id,
      scheme_id: schemeId,
      district_id: districtId,
    });

    showToast("Application submitted successfully! AI evaluation initiated.", "success");
    closeModal("apply-modal");
  } catch (error) {
    showToast(error.message || "Failed to submit application", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSchemes();
});
