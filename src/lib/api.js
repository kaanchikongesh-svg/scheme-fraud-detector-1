/**
 * API client wrapper with base URL and auth token injection.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  getToken() {
    return localStorage.getItem('verdant_token');
  }

  getHeaders(customHeaders = {}, includeContentType = true) {
    const headers = {
      ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
      ...customHeaders,
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const config = {
      ...options,
      headers: this.getHeaders(options.headers, !isFormData),
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || 25000);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 401) {
        localStorage.removeItem('verdant_token');
        localStorage.removeItem('verdant_user');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('verdant_auth_reset'));
        }
      }

      if (!response.ok) {
        let errorMsg = `Request failed (HTTP ${response.status})`;
        let errorCode = 'API_ERROR';
        if (response.status === 409) errorCode = 'DUPLICATE_EMAIL';
        else if (response.status === 400) errorCode = 'VALIDATION_ERROR';
        else if (response.status === 401 || response.status === 403) errorCode = 'AUTHENTICATION_ERROR';
        else if (response.status >= 500) errorCode = 'DATABASE_ERROR';

        try {
          const errBody = await response.json();
          if (errBody.error) errorCode = errBody.error;
          // FastAPI sends `detail` — can be a string OR an array (Pydantic validation errors)
          if (errBody.detail) {
            if (Array.isArray(errBody.detail)) {
              // Pydantic validation error array: [{loc, msg, type}]
              errorMsg = errBody.detail.map(e => e.msg || JSON.stringify(e)).join('; ');
            } else if (typeof errBody.detail === 'string') {
              errorMsg = errBody.detail;
            } else {
              errorMsg = JSON.stringify(errBody.detail);
            }
          } else if (typeof errBody.message === 'string') {
            errorMsg = errBody.message;
          } else if (typeof errBody.error === 'string') {
            errorMsg = errBody.error;
          }
        } catch {
          // Non-JSON error body — keep the HTTP status message
        }
        const error = new Error(errorMsg);
        error.status = response.status;
        error.code = errorCode;
        throw error;
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        const err = new Error('Backend request timed out. Please verify backend service on port 8000.');
        err.code = 'BACKEND_UNAVAILABLE';
        err.status = 504;
        throw err;
      }
      if (!error.status) {
        const err = new Error('Unable to connect to the backend server. Please verify the Python service is running on port 8000.');
        err.code = 'BACKEND_UNAVAILABLE';
        err.status = 503;
        throw err;
      }
      throw error;
    }

  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: typeof FormData !== 'undefined' && body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  getFile(endpoint) {
    return fetch(`${this.baseUrl}${endpoint}`, { headers: this.getHeaders({}, false) }).then(async response => {
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      return response.blob();
    });
  }

  upload(endpoint, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('POST', `${this.baseUrl}${endpoint}`);
      const token = this.getToken();
      if (token) request.setRequestHeader('Authorization', `Bearer ${token}`);
      request.upload.onprogress = event => {
        if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
      };
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          try { resolve(JSON.parse(request.responseText)); } catch { reject(new Error('Invalid upload response')); }
        } else {
          try { reject(new Error(JSON.parse(request.responseText).detail || `HTTP Error ${request.status}`)); } catch { reject(new Error(`HTTP Error ${request.status}`)); }
        }
      };
      request.onerror = () => reject(new Error('Upload failed: backend unavailable'));
      request.send(formData);
    });
  }
}

export const api = new ApiClient();
export default api;
