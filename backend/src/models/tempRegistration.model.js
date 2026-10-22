import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { TEMP_REGISTRATION_CONFIG, BCRYPT_CONFIG } from "../utils/constants.js";

const tempRegistrationSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name cannot exceed 50 characters"],
    },

    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        "Please provide a valid email address",
      ],
    },

    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [
        /^[6-9]\d{9}$/,
        "Please provide a valid 10-digit Indian mobile number",
      ],
    },

    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false,
    },

    // Consent captured at sign-up, copied onto the user after OTP verification
    termsAcceptedAt: { type: Date, default: null },
    termsVersion: { type: String, default: null },
    ageConfirmation: { type: String, enum: ["adult", "guardian", null], default: null },

    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + TEMP_REGISTRATION_CONFIG.EXPIRY_MS),
    },
  },

  {
    timestamps: true,

    toJSON: {
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

tempRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

tempRegistrationSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) {
    return;
  }
  this.passwordHash = await bcrypt.hash(
    this.passwordHash,
    BCRYPT_CONFIG.SALT_ROUNDS,
  );
});

tempRegistrationSchema.statics.findByEmail = async function (email) {
  return await this.findOne({
    email: email.toLowerCase().trim(),
    expiresAt: { $gt: new Date() },
  }).select("+passwordHash");
};

tempRegistrationSchema.statics.hasPendingRegistration = async function (email) {
  const doc = await this.findOne({
    email: email.toLowerCase().trim(),
    expiresAt: { $gt: new Date() },
  });
  return !!doc;
};

tempRegistrationSchema.methods.isValid = function () {
  return this.expiresAt > new Date();
};

tempRegistrationSchema.methods.refreshExpiry = async function () {
  this.expiresAt = new Date(Date.now() + TEMP_REGISTRATION_CONFIG.EXPIRY_MS);
  await this.save();
};

const TempRegistration = mongoose.model(
  "TempRegistration",
  tempRegistrationSchema,
);

export default TempRegistration;
