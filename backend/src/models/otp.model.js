import mongoose from "mongoose";
import crypto from "crypto";
import { OTP_CONFIG } from "../utils/constants.js";

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    email: {
      type: String,
      required: [true, "Email is required for OTP"],
      lowercase: true,
      trim: true,
      index: true,
    },

    otpHash: {
      type: String,
      required: [true, "OTP hash is required"],
      select: false,
    },

    purpose: {
      type: String,
      required: [true, "OTP purpose is required"],
      enum: {
        values: Object.values(OTP_CONFIG.PURPOSES),
        message: "Purpose must be either 'registration' or 'forgotPassword'",
      },
    },

    attempts: {
      type: Number,
      default: 0,
      min: [0, "Attempts cannot be negative"],
    },

    maxAttempts: {
      type: Number,
      default: OTP_CONFIG.MAX_ATTEMPTS,
    },

    isUsed: {
      type: Boolean,
      default: false,
    },
    // Forgot-password only: issued after the OTP is verified, required by
    // /reset-password. Single use, short-lived, stored only as a hash.
    resetTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    resetTokenExpiresAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + OTP_CONFIG.EXPIRY_MS),
    },
  },

  {
    timestamps: true,

    toJSON: {
      transform: function (doc, ret) {
        delete ret.otpHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

otpSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

otpSchema.index({ email: 1, purpose: 1, isUsed: 1 });

otpSchema.statics.generateOtp = function () {
  const rawOtp = crypto.randomInt(100000, 999999).toString();
  const otpHash = crypto.createHash("sha256").update(rawOtp).digest("hex");
  return { rawOtp, otpHash };
};

otpSchema.statics.verifyOtp = function (submittedOtp, storedOtpHash) {
  const submittedHash = crypto
    .createHash("sha256")
    .update(submittedOtp.toString())
    .digest("hex");

  const storedBuffer = Buffer.from(storedOtpHash, "hex");
  const submittedBuffer = Buffer.from(submittedHash, "hex");

  if (storedBuffer.length !== submittedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, submittedBuffer);
};

otpSchema.methods.isValid = function () {
  const now = new Date();
  return (
    !this.isUsed &&
    this.expiresAt > now &&
    this.attempts < this.maxAttempts
  );
};

otpSchema.methods.isExhausted = function () {
  return this.attempts >= this.maxAttempts;
};

const OTP = mongoose.model("OTP", otpSchema);

export default OTP;
