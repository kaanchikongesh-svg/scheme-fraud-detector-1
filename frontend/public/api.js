/**
 * SchemeSecure AI — Central API Client
 */

const API_BASE_URL = (() => {
  if (typeof window !== 'undefined') {
    if (window.VITE_API_BASE_URL || window.VITE_API_URL || window.API_BASE_URL) {
      return (window.VITE_API_BASE_URL || window.VITE_API_URL || window.API_BASE_URL).replace(/\/+$/, '');
    }
    const host = window.location.hostname;
    const port = window.location.port;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host === '0.0.0.0';
    if (isLocal) {
      if (port === '5173') {
        return '';
      }
      return 'http://127.0.0.1:8000';
    }
    return 'https://ai-scheme-leakage-detector.onrender.com';
  }
  return 'http://127.0.0.1:8000';
})();


/**
 * Core HTTP Request Dispatcher
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {})
  };

  // Inject JWT Token from localStorage if available
  const token = localStorage.getItem("govkavach_token");
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);

    const response = await fetch(url, {
      ...config,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    // Handle Unauthorized / Session Expiry
    if (response.status === 401) {
      if (!endpoint.includes("/auth/login") && !endpoint.includes("/auth/register")) {
        localStorage.removeItem("govkavach_token");
        localStorage.removeItem("govkavach_user");
        if (window.location.pathname !== "/login.html" && !window.location.pathname.endsWith("login.html")) {
          window.location.href = "login.html";
        }
      }
    }

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) {
          if (Array.isArray(errorJson.detail)) {
            errorMsg = errorJson.detail.map(d => d.msg || JSON.stringify(d)).join("; ");
          } else {
            errorMsg = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
          }
        } else if (errorJson.message) {
          errorMsg = errorJson.message;
        } else if (errorJson.error) {
          errorMsg = errorJson.error;
        }
      } catch {
        // Non-JSON response
      }
      const error = new Error(errorMsg);
      error.status = response.status;
      throw error;
    }

    // Return JSON or empty if 204 No Content
    if (response.status === 204) return null;
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error("Request timed out. Please verify backend is running at " + API_BASE_URL, { cause: error });
    }
    if (!error.status) {
      throw new Error("Cannot reach backend server. Please verify FastAPI is running at " + API_BASE_URL, { cause: error });
    }
    throw error;
  }
}

/**
 * High-Level API Namespaces
 */
const api = {
  baseUrl: API_BASE_URL,
  request: apiRequest,

  // System & Health
  health: () => apiRequest("/api/v1/health"),

  // Authentication
  auth: {
    login: (credentials) => apiRequest("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    }),
    register: (userData) => apiRequest("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(userData)
    }),
    getMe: () => apiRequest("/api/v1/auth/me"),
    forgotPassword: (emailOrMobile) => apiRequest("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(emailOrMobile)
    }),
    resetPassword: (payload) => apiRequest("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
    logout: () => apiRequest("/api/v1/auth/logout", { method: "POST" })
  },

  // Districts
  districts: {
    getAll: () => apiRequest("/api/v1/districts")
  },

  // Government Schemes
  schemes: {
    getAll: () => apiRequest("/api/v1/schemes"),
    getById: (id) => apiRequest(`/api/v1/schemes/${id}`),
    create: (data) => apiRequest("/api/v1/schemes", {
      method: "POST",
      body: JSON.stringify(data)
    })
  },

  // Beneficiaries
  beneficiaries: {
    getAll: (params = {}) => {
      const searchParams = new URLSearchParams(params);
      return apiRequest(`/api/v1/beneficiaries?${searchParams}`);
    },
    getById: (id) => apiRequest(`/api/v1/beneficiaries/${id}`),
    create: (data) => apiRequest("/api/v1/beneficiaries", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    updateStatus: (id, status) => apiRequest(`/api/v1/beneficiaries/${id}/status?new_status=${status}`, {
      method: "PATCH"
    })
  },

  // Applications & Claims
  applications: {
    getAll: (params = {}) => {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== 'all' && value !== '') {
          searchParams.append(key, value);
        }
      }
      return apiRequest(`/api/v1/applications${searchParams.toString() ? `?${searchParams}` : ''}`);
    },
    getSummary: () => apiRequest("/api/v1/applications/summary"),
    getMy: () => apiRequest("/api/v1/applications/my"),
    getById: (id) => apiRequest(`/api/v1/applications/${id}`),
    getVerification: (id) => apiRequest(`/api/v1/applications/${id}/verification`),
    create: (data) => apiRequest("/api/v1/applications", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    updateStatus: (id, newStatus, note = '') => {
      const query = `new_status=${encodeURIComponent(newStatus)}${note ? `&note=${encodeURIComponent(note)}` : ''}`;
      return apiRequest(`/api/v1/applications/${id}/status?${query}`, {
        method: "PUT"
      });
    },
    getDocuments: (id) => apiRequest(`/api/v1/applications/${id}/documents`)
  },

  // AI Leakage Detection & Intelligence
  ai: {
    getDashboardSummary: () => apiRequest("/api/v1/ai/dashboard-summary"),
    evaluateBeneficiary: (beneficiaryId) => apiRequest(`/api/v1/ai/evaluate/${beneficiaryId}`, {
      method: "POST"
    }),
    getPredictions: (params = {}) => {
      const searchParams = new URLSearchParams(params);
      return apiRequest(`/api/v1/ai/predictions?${searchParams}`);
    },
    getPredictionByBeneficiary: (beneficiaryId) => apiRequest(`/api/v1/ai/predictions/${beneficiaryId}`),
    getNetworkGraph: (beneficiaryId) => apiRequest(`/api/v1/ai/network-graph/${beneficiaryId}`)
  },

  // Document Verification & Authenticity
  verification: {
    getTestSamples: () => apiRequest("/api/v1/documents/test-samples"),
    aiTestSample: (scenarioId) => apiRequest(`/api/v1/documents/ai-test-sample/${scenarioId}`, {
      method: "POST"
    }),
    aiTestCustom: (formData) => apiRequest("/api/v1/documents/ai-test", {
      method: "POST",
      body: formData
    }),
    verifyDocument: (docId, status, reason = '') => apiRequest(`/api/v1/documents/${docId}/verify`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason })
    })
  },

  // Complaints & Grievances
  complaints: {
    getAll: () => apiRequest("/api/v1/complaints"),
    create: (data) => apiRequest("/api/v1/complaints", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    updateStatus: (id, status, notes = '') => apiRequest(`/api/v1/complaints/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes })
    })
  },

  // Admin & Audit
  admin: {
    getUsers: () => apiRequest("/api/v1/admin/users"),
    createUser: (userData) => apiRequest("/api/v1/admin/users", {
      method: "POST",
      body: JSON.stringify(userData)
    }),
    getAuditLogs: (skip = 0, limit = 100) => apiRequest(`/api/v1/admin/audit-logs?skip=${skip}&limit=${limit}`)
  }
};

// Global Toast Notification Helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
