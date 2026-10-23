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

// Account deletion: the member asks (password required), the gym admin decides
export const getDeletionRequest = () =>
  api.get("/profile/deletion-request");

export const requestAccountDeletion = ({ password, reason }) =>
  api.post("/profile/deletion-request", { password, reason });

export const cancelDeletionRequest = () =>
  api.delete("/profile/deletion-request");

// Member saves their government ID — only works after the front desk unlocks it
export const saveMyId = ({ docType, number, consent }) =>
  api.post("/profile/id", { docType, number, consent });
