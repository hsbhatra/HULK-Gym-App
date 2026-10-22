// =============================================================================
// src/services/profileService.js
// =============================================================================

import api from "./api.js";

export const getProfile = () =>
  api.get("/profile");

export const updateProfile = (data) =>
  api.patch("/profile", data);

export const updateProfilePicture = (formData) =>
  api.patch("/profile/picture", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteProfilePicture = () =>
  api.delete("/profile/picture");

// Member deletes their own account (password required)
export const deleteMyAccount = (password) =>
  api.post("/profile/delete", { password });
