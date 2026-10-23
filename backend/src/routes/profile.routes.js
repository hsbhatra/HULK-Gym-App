// =============================================================================
// src/routes/profile.routes.js
// =============================================================================

import { Router } from "express";
import authenticate from "../middleware/auth/authenticate.middleware.js";
import sessionGuard from "../middleware/auth/sessionGuard.middleware.js";
import { uploadProfilePictureMiddleware } from "../middleware/upload/upload.middleware.js";
import { validateUpdateProfile } from "../middleware/validation/auth.validation.js";


import {
  getMyProfile,
  updateMyProfile,
  updateMyProfilePicture,
  deleteMyProfilePicture,
  getMyDeletionRequest,
  requestMyAccountDeletion,
  cancelMyDeletionRequest,
  saveMyIdProof,
} from "../controllers/profile.controller.js";
import { sensitiveActionLimiter } from "../middleware/rateLimiter.middleware.js";

const router = Router();

// All profile routes require authentication
router.use(authenticate, sessionGuard);

router.get   ("/",        getMyProfile);
router.patch ("/",        validateUpdateProfile, updateMyProfile);
router.patch ("/picture", uploadProfilePictureMiddleware, updateMyProfilePicture);
router.delete("/picture", deleteMyProfilePicture);
// Account deletion needs the gym admin's approval
router.get   ("/deletion-request", getMyDeletionRequest);
router.post  ("/deletion-request", sensitiveActionLimiter, requestMyAccountDeletion);
router.delete("/deletion-request", cancelMyDeletionRequest);
router.post  ("/id",      sensitiveActionLimiter, saveMyIdProof);

export default router;
