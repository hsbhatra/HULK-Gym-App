// =============================================================================
// src/store/authStore.js
// =============================================================================

import { create } from "zustand";

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false, // ← NEW: has the app tried to restore session yet?

  setAuth: (user, accessToken) =>
    set({
      user,
      accessToken,
      isAuthenticated: true,
      isInitialized: true,
    }),

  setAccessToken: (accessToken) => set({ accessToken }),

  setUser: (user) => set({ user }),

  // manualLogout: true for ~1.5s after a user-initiated logout. Protected
  // routes that are still animating out render nothing instead of
  // redirecting to /login?redirect=<old page>, so the caller's own
  // navigate() decides where the user lands.
  manualLogout: false,

  logout: ({ manual = false } = {}) => {
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitialized: true, // still initialized — just not logged in
      manualLogout: manual,
    });
    if (manual) setTimeout(() => set({ manualLogout: false }), 1500);
  },

  // Called when init completes but no session was found
  setInitialized: () => set({ isInitialized: true }),
}));
