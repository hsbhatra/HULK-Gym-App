import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  USER_ROLES_ARRAY,
  USER_ROLES,
  BCRYPT_CONFIG,
  GYM_CONFIG,
} from "../utils/constants.js";
import Counter from "./counter.model.js";

const userSchema = new mongoose.Schema(
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
      unique: true,
      trim: true,
      match: [
        /^[6-9]\d{9}$/,
        "Please provide a valid 10-digit Indian mobile number",
      ],
    },

    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },

    role: {
      type: String,
      enum: {
        values: USER_ROLES_ARRAY,
        message: "Role must be one of: member, trainer, admin",
      },
      default: USER_ROLES.MEMBER,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    profilePicture: {
      type: String,
      default: null,
      // Stores the Cloudinary URL of the profile picture
    },

    profilePicturePublicId: {
      type: String,
      default: null,
      // Stores the Cloudinary public_id — needed to delete the old image
      // when user uploads a new one or removes their picture
    },

    // --- READABLE USER ID ---
    userId: {
      type: String,
      unique: true,
      sparse: true, // allows null values without unique conflict
      trim: true,
    },

    // --- BODY INFORMATION ---
    height: {
      type: Number,
      default: null,
      min: [50, "Height must be at least 50cm"],
      max: [300, "Height cannot exceed 300cm"],
    },

    weight: {
      type: Number,
      default: null,
      min: [20, "Weight must be at least 20kg"],
      max: [500, "Weight cannot exceed 500kg"],
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other", "preferNotToSay"],
        message: "Invalid gender value",
      },
      default: null,
    },

    bio: {
      type: String,
      default: null,
      maxlength: [200, "Bio cannot exceed 200 characters"],
      trim: true,
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

// Hook 1 — Password hashing
userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;
  this.passwordHash = await bcrypt.hash(
    this.passwordHash,
    BCRYPT_CONFIG.SALT_ROUNDS,
  );
});

// Hook 2 — Auto-generate userId for new users
userSchema.pre("save", async function () {
  if (!this.isNew || this.userId) return;

  // Atomic counter — prevents race condition on concurrent registrations
  const Counter = mongoose.model("Counter");
  const counter = await Counter.findOneAndUpdate(
    { _id: "userId" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  this.userId = `${GYM_CONFIG.PREFIX}_${String(counter.seq).padStart(4, "0")}`;
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.index({ role: 1, isActive: 1 });

const User = mongoose.model("User", userSchema);

export default User;
