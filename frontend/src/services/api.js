// =============================================================================
// src/services/api.js
// =============================================================================
// Central Axios instance with automatic token attachment and refresh logic.
// Every API call in the app goes through this instance.
// =============================================================================

import axios from "axios";
import { useAuthStore } from "../store/authStore.js";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

// Create the main Axios instance
const api = axios.create({
  baseURL       : BASE_URL,
  withCredentials: true, // sends the HTTP-only refresh token cookie automatically
  headers       : { "Content-Type": "application/json" },
});

// =============================================================================
// REQUEST INTERCEPTOR
// =============================================================================
// Runs before every request leaves the browser.
// Automatically attaches the access token to the Authorization header.
// =============================================================================

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =============================================================================
// RESPONSE INTERCEPTOR
// =============================================================================
// Runs after every response comes back.
//
// If we get a 401 (token expired):
//   1. Call /auth/refresh-token to get a new access token
//   2. Save the new token to Zustand store
//   3. Retry the original failed request with the new token
//   4. If refresh also fails → log the user out
// =============================================================================

let isRefreshing  = false;
// isRefreshing flag prevents multiple simultaneous refresh calls
// (e.g. if 3 requests fail at the same time, only one refresh is made)

let failedQueue   = [];
// failedQueue holds all requests that failed while a refresh was in progress
// Once the refresh completes, all queued requests are retried

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  // Success — just return the response as-is
  (response) => response,

  // Error — check if it's a 401 and handle token refresh
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 errors that haven't been retried yet
    // _retry flag prevents infinite retry loops
    // A 401 from login/register/OTP/password endpoints means "wrong
    // credentials", not "session expired" — let the page show the error
    // instead of attempting a refresh and hard-reloading /login.
    const url = originalRequest?.url || "";
    const isAuthEndpoint = /\/auth\/(login|register|verify|resend|forgot|reset|refresh)/.test(url);

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      // If a refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint — cookie is sent automatically
        const response = await axios.get(
          `${BASE_URL}/auth/refresh-token`,
          { withCredentials: true }
        );

        const newToken = response.data.data.accessToken;

        // Save new token to Zustand store
        useAuthStore.getState().setAccessToken(newToken);

        // Update the Authorization header for future requests
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        // Retry all queued requests with new token
        processQueue(null, newToken);

        // Retry the original failed request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — token is truly expired or revoked
        // Log the user out completely
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        // Keep the user's place so they return to it after logging in
        const here = window.location.pathname + window.location.search;
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = `/login?redirect=${encodeURIComponent(here)}`;
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
