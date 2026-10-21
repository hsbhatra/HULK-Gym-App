// =============================================================================
// src/routes/subscription.routes.js
// =============================================================================

import { Router } from "express";
import authenticate from "../middleware/auth/authenticate.middleware.js";
import sessionGuard from "../middleware/auth/sessionGuard.middleware.js";

import {
  initiate,
  verify,
  getMyHistory,
  getMyActive,
  getMyReceiptsList,
} from "../controllers/subscription.controller.js";

const router = Router();

router.use(authenticate, sessionGuard);

router.post("/initiate",   initiate);
router.post("/verify",     verify);
router.get ("/my",         getMyHistory);
router.get ("/my/active",  getMyActive);
router.get ("/my/receipts", getMyReceiptsList);

export default router;
