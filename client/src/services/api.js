const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const DEFAULT_TIMEOUT_MS = 30000;

function getAccessToken() {
  try {
    return localStorage.getItem('accessToken');
  } catch {
    return null;
  }
}

function setAccessToken(token) {
  try {
    if (token) localStorage.setItem('accessToken', token);
    else localStorage.removeItem('accessToken');
  } catch {
    /* ignore storage errors (private mode, quota) */
  }
}

function getRefreshToken() {
  try {
    return localStorage.getItem('refreshToken');
  } catch {
    return null;
  }
}

function setRefreshToken(token) {
  try {
    if (token) localStorage.setItem('refreshToken', token);
    else localStorage.removeItem('refreshToken');
  } catch {
    /* ignore storage errors */
  }
}

function buildQuery(params) {
  if (!params) return '';
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) v.forEach((item) => usp.append(k, String(item)));
    else usp.append(k, String(v));
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

async function tryRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const r = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!r.ok) {
      setAccessToken(null);
      setRefreshToken(null);
      return false;
    }
    const data = await r.json();
    const newAccess = data?.accessToken || data?.data?.accessToken;
    const newRefresh = data?.refreshToken || data?.data?.refreshToken;
    if (newAccess) setAccessToken(newAccess);
    if (newRefresh) setRefreshToken(newRefresh);
    return Boolean(newAccess);
  } catch {
    return false;
  }
}

async function request(path, options = {}) {
  const {
    method = 'GET',
    headers: customHeaders = {},
    body,
    params,
    timeout = DEFAULT_TIMEOUT_MS,
    _retry = false,
  } = options;

  const query = method === 'GET' ? buildQuery(params) : '';
  const isAbsolute = /^https?:\/\//i.test(path);
  const url = isAbsolute ? `${path}${query}` : `${API_BASE}${path}${query}`;

  const headers = { ...customHeaders };
  if (body && !(body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getAccessToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let payload = body;
  if (payload && typeof payload !== 'string' && !(payload instanceof FormData)) {
    payload = JSON.stringify(payload);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: payload,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const error = new Error(err.name === 'AbortError' ? 'Request timed out' : 'Network error');
    error.status = 0;
    error.cause = err;
    throw error;
  }
  clearTimeout(timer);

  // Try to refresh once on 401 (skip retry endpoints and re-refresh calls)
  if (
    response.status === 401 &&
    !_retry &&
    !path.includes('/auth/refresh-token') &&
    !path.includes('/auth/login')
  ) {
    const refreshOk = await tryRefresh();
    if (refreshOk) {
      return request(path, { ...options, _retry: true });
    }
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  let parsed;
  try {
    parsed = isJson ? await response.json() : await response.text();
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const errorPayload = parsed?.error || parsed;
    const message =
      errorPayload?.message ||
      parsed?.message ||
      (typeof parsed === 'string' && parsed) ||
      `HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.code = errorPayload?.code;
    err.details = errorPayload?.details;
    err.raw = parsed;
    throw err;
  }

  // Return the full { data, success, error } envelope so callers can use
  // res.data.success / res.data.data consistently (#chunk-fix: was previously
  // unwrapping `parsed.data`, which broke `res.data.success` lookups).
  return parsed;
}

async function upload(path, formData) {
  const token = getAccessToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Do not set Content-Type for FormData; the browser sets it with boundary.
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const parsed = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    const errorPayload = parsed?.error || parsed;
    const err = new Error(errorPayload?.message || parsed?.message || `HTTP ${response.status}`);
    err.status = response.status;
    err.code = errorPayload?.code;
    throw err;
  }
  // See request() — return the full envelope for consistency.
  return parsed;
}

export const api = {
  get: (path, opts = {}) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts = {}) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts = {}) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts = {}) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts = {}) => request(path, { ...opts, method: 'DELETE' }),
  del: (path, opts = {}) => request(path, { ...opts, method: 'DELETE' }),

  upload,

  // Token management (used by AuthContext and login flows)
  setAccessToken,
  setRefreshToken,
  getAccessToken,
  getRefreshToken,
  clearTokens: () => {
    setAccessToken(null);
    setRefreshToken(null);
  },

  API_BASE,
};

export default api;
