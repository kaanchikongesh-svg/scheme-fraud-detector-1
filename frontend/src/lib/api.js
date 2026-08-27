/**
 * API client wrapper with base URL and auth token injection.
 */

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.hostname.startsWith('192.168.') ||
                    window.location.hostname.startsWith('10.') ||
                    window.location.hostname === '0.0.0.0';
    if (isLocal) {
      if (window.location.port === '5173') {
        return '';
      }
      return 'http://127.0.0.1:8000';
    }
    // On Vercel production, use same-origin relative URLs to leverage Vercel rewrites.
    // This completely eliminates ERR_BLOCKED_BY_CLIENT ad-blocker false positives.
    return '';
  }
  return 'http://127.0.0.1:8000';
};

const API_BASE_URL = getApiBaseUrl();


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

    // Default 75s timeout to gracefully allow Render free tier containers to wake up
    const requestTimeout = options.timeout || 75000;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

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
        if (response.status === 409) {
          errorCode = 'DUPLICATE_ACCOUNT';
          errorMsg = 'An account with this email or mobile number already exists.';
        } else if (response.status === 400) {
          errorCode = 'VALIDATION_ERROR';
          errorMsg = 'Please correct the highlighted fields.';
        } else if (response.status === 401) {
          errorCode = 'AUTHENTICATION_ERROR';
          errorMsg = 'Invalid email or password.';
        } else if (response.status === 403) {
          errorCode = 'FORBIDDEN';
          errorMsg = 'You do not have permission to perform this action.';
        } else if (response.status >= 500) {
          errorCode = 'DATABASE_ERROR';
          errorMsg = 'Unable to complete the request. Please try again later.';
        }

        try {
          const errBody = await response.json();
          if (errBody.error) errorCode = errBody.error;
          if (errBody.detail) {
            if (Array.isArray(errBody.detail)) {
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
          // Non-JSON error body — keep categorized message
        }
        const error = new Error(errorMsg);
        error.status = response.status;
        error.code = errorCode;
        throw error;
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        const err = new Error('The backend server is waking up from idle mode. Please try again in a moment.');
        err.code = 'BACKEND_TIMEOUT';
        err.status = 504;
        throw err;
      }
      if (!error.status) {
        const err = new Error('Backend service is connecting. If this is the first request, the server is spinning up.');
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
      request.timeout = 60000; // 60s timeout for cloud OCR & AI forensics
      const token = this.getToken();
      if (token) request.setRequestHeader('Authorization', `Bearer ${token}`);
      request.upload.onprogress = event => {
        if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
      };
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          try { resolve(JSON.parse(request.responseText)); } catch { reject(new Error('Invalid upload response format')); }
        } else {
          try {
            const parsed = JSON.parse(request.responseText);
            const msg = parsed.detail || parsed.message || parsed.error || `Upload failed (HTTP ${request.status})`;
            reject(new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)));
          } catch {
            reject(new Error(`Upload failed with status ${request.status}`));
          }
        }
      };
      request.ontimeout = () => reject(new Error('Document processing timed out. The server is processing large files. Please try again.'));
      request.onerror = () => reject(new Error('Document upload connection failed. Please check network connection.'));
      request.send(formData);
    });
  }

}

export const api = new ApiClient();
export default api;
