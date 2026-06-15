import axios from 'axios';

// Create API axios instance
const api = axios.create({
  baseURL: 'http://localhost:5010/api',
  withCredentials: true, // Allow cookies to be sent
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessToken = '';

export const setAccessToken = (token: string) => {
  accessToken = token;
};

export const getAccessToken = () => {
  return accessToken;
};

// Add request interceptor to append JWT token
api.interceptors.request.use(
  (config) => {
    if (accessToken && config.headers) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle token expiration (401/403) and refresh automatically
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Guard to check if it's a 401/403 response and hasn't been retried yet
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      // Do not try to refresh if the request is already login or refresh itself
      if (originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Request token refresh
        const res = await axios.post(
          'http://localhost:5000/api/auth/refresh',
          {},
          { withCredentials: true }
        );
        
        const newAccessToken = res.data.accessToken;
        setAccessToken(newAccessToken);
        
        processQueue(null, newAccessToken);
        isRefreshing = false;

        // Replay original request
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        
        // Token refresh failed, meaning refresh token is expired or deleted.
        // Wipe local tokens and redirect to login
        setAccessToken('');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
