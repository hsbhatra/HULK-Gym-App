import DateInput from "../ui/DateInput";
import { useState, useRef } from "react";
import { useAuthStore } from "../../store/authStore.js";
import {
  updateProfile,
  updateProfilePicture,
  deleteProfilePicture,
} from "../../services/profileService.js";
import toast from "react-hot-toast";
import { Camera } from "lucide-react";
import DeleteAccountSection from "./DeleteAccountSection.jsx";
import { labelStyle } from "../ui/formStyles.js";

export default function ProfileSection({ user, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef(null);
  const setStoreUser = useAuthStore((s) => s.setUser);

  const formFromUser = (u) => ({
    firstName: u.firstName || "",
    lastName: u.lastName || "",
    height: u.height || "",
    weight: u.weight || "",
    dateOfBirth: u.dateOfBirth ? u.dateOfBirth.split("T")[0] : "",
    gender: u.gender || "",
    bio: u.bio || "",
  });
  const [form, setForm] = useState(() => formFromUser(user));
  const today = new Date().toISOString().split("T")[0];

  // Discard unsaved edits — otherwise the cancelled values stay on screen
  // and look like they were saved.
  const handleCancel = () => {
    setForm(formFromUser(user));
    setEditing(false);
  };

  // Catch obvious mistakes before hitting the API
  const validateForm = (f) => {
    const nameRe = /^[A-Za-z][A-Za-z .'-]*$/;
    for (const [key, label] of [["firstName", "First name"], ["lastName", "Last name"]]) {
      const v = f[key].trim();
      if (v.length < 2) return `${label} must be at least 2 characters`;
      if (!nameRe.test(v)) return `${label} can only contain letters`;
    }
    if (f.height !== "" && (Number(f.height) < 50 || Number(f.height) > 300))
      return "Height must be between 50 and 300 cm";
    if (f.weight !== "" && (Number(f.weight) < 20 || Number(f.weight) > 500))
      return "Weight must be between 20 and 500 kg";
    if (f.dateOfBirth && f.dateOfBirth > today)
      return "Date of birth cannot be in the future";
    return null;
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    const problem = validateForm(form);
    if (problem) return toast.error(problem);
    setSaving(true);
    try {
      const payload = {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      };
      if (!payload.height) delete payload.height;
      if (!payload.weight) delete payload.weight;
      if (!payload.dateOfBirth) delete payload.dateOfBirth;
      if (!payload.gender) delete payload.gender;
      if (!payload.bio) delete payload.bio;

      const res = await updateProfile(payload);
      const updated = res.data.data.user;
      onUpdate(updated);
      setStoreUser(updated);
      setEditing(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("profilePicture", file);
    setUploading(true);
    try {
      const res = await updateProfilePicture(formData);
      const updated = res.data.data.user;
      onUpdate(updated);
      setStoreUser(updated);
      toast.success("Profile picture updated!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload picture.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePicture = async () => {
    setRemoving(true);
    try {
      const res = await deleteProfilePicture();
      const updated = res.data.data.user;
      onUpdate(updated);
      setStoreUser(updated);
      toast.success("Profile picture removed.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove picture.");
    } finally {
      setRemoving(false);
    }
  };

  const inputStyle = (disabled) => ({
    width: "100%",
    background: disabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
    border: `1px solid ${disabled ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)"}`,
    borderRadius: "10px",
    padding: "11px 14px",
    color: disabled ? "#8c8c86" : "#fff",
    fontSize: "16px",
    outline: "none",
    cursor: disabled ? "not-allowed" : "text",
    transition: "border-color 0.2s, background 0.2s",
  });


  return (
    <div>
      {/* Avatar row */}
      <div className="profile-avatar-row">
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              width: "88px",
              height: "88px",
              borderRadius: "50%",
              border: "2px solid rgba(243,212,0,0.3)",
              overflow: "hidden",
              background: "var(--iron-850)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt="Profile"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span
                style={{
                  fontSize: "32px",
                  fontWeight: "800",
                  color: "#f3d400",
                }}
              >
                {user.firstName?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          {/* Upload overlay */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "none",
              background: "rgba(0,0,0,0)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(0,0,0,0.5)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(0,0,0,0)")
            }
          >
            <span
              style={{
                fontSize: "19px",
                opacity: 0,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
            >
              <Camera size={16} aria-hidden="true" />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePictureUpload}
          />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}
          >
            {user.firstName} {user.lastName}
          </h2>
          <p
            style={{
              fontSize: "15px",
              color: "#f3d400",
              fontWeight: "600",
              marginBottom: "8px",
            }}
          >
            @{user.userId || "hulkgym_user"}
          </p>
          <span
            style={{
              fontSize: "13px",
              padding: "3px 10px",
              borderRadius: "100px",
              background: "rgba(243,212,0,0.1)",
              border: "1px solid rgba(243,212,0,0.2)",
              color: "#f3d400",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {user.role}
          </span>
        </div>

        {/* Picture actions */}
        <div
          className="avatar-actions"
          style={{ display: "flex", flexDirection: "column", gap: "8px" }}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(243,212,0,0.3)",
              background: "rgba(243,212,0,0.08)",
              color: "#f3d400",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {uploading ? "Uploading..." : "Change Photo"}
          </button>
          {user.profilePicture && (
            <button
              onClick={handleRemovePicture}
              disabled={removing}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(239,68,68,0.2)",
                background: "transparent",
                color: "#ef4444",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {removing ? "Removing..." : "Remove"}
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Section: Personal Info */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "rgba(255,255,255,0.6)",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              Personal Information
            </h3>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                style={{
                  padding: "7px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(243,212,0,0.3)",
                  background: "rgba(243,212,0,0.08)",
                  color: "#f3d400",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Edit Profile
              </button>
            ) : (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleCancel}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "transparent",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: "7px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#f3d400",
                    color: "#0a0a0a",
                    fontSize: "14px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>

          <div className="profile-form-grid">
            {/* First Name */}
            <div>
              <label style={labelStyle}>First Name</label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                disabled={!editing}
                style={inputStyle(!editing)}
                onFocus={(e) => {
                  if (editing) e.target.style.borderColor = "#f3d400";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = editing
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(255,255,255,0.05)";
                }}
              />
            </div>
            {/* Last Name */}
            <div>
              <label style={labelStyle}>Last Name</label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                disabled={!editing}
                style={inputStyle(!editing)}
                onFocus={(e) => {
                  if (editing) e.target.style.borderColor = "#f3d400";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = editing
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(255,255,255,0.05)";
                }}
              />
            </div>
            {/* Email — read only */}
            <div>
              <label style={labelStyle}>
                Email Address{" "}
                <span
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: "400",
                    textTransform: "none",
                    letterSpacing: 0,
                    fontSize: "13px",
                  }}
                >
                  (cannot be changed)
                </span>
              </label>
              <input
                value={user.email}
                disabled
                style={{ ...inputStyle(true), cursor: "not-allowed" }}
              />
            </div>
            {/* Phone — read only */}
            <div>
              <label style={labelStyle}>
                Phone Number{" "}
                <span
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: "400",
                    textTransform: "none",
                    letterSpacing: 0,
                    fontSize: "13px",
                  }}
                >
                  (cannot be changed)
                </span>
              </label>
              <input
                value={`+91 ${user.phoneNumber}`}
                disabled
                style={{ ...inputStyle(true), cursor: "not-allowed" }}
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />

        {/* Section: Body Information */}
        <div>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "700",
              color: "rgba(255,255,255,0.6)",
              letterSpacing: "1px",
              textTransform: "uppercase",
              marginBottom: "16px",
            }}
          >
            Body Information
          </h3>
          <div className="profile-form-grid">
            {/* Height */}
            <div>
              <label style={labelStyle}>Height (cm)</label>
              <input
                type="number"
                name="height"
                min={50}
                max={300}
                value={form.height}
                onChange={handleChange}
                disabled={!editing}
                placeholder="e.g. 175"
                style={inputStyle(!editing)}
                onFocus={(e) => {
                  if (editing) e.target.style.borderColor = "#f3d400";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = editing
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(255,255,255,0.05)";
                }}
              />
            </div>
            {/* Weight */}
            <div>
              <label style={labelStyle}>Weight (kg)</label>
              <input
                type="number"
                name="weight"
                min={20}
                max={500}
                value={form.weight}
                onChange={handleChange}
                disabled={!editing}
                placeholder="e.g. 70"
                style={inputStyle(!editing)}
                onFocus={(e) => {
                  if (editing) e.target.style.borderColor = "#f3d400";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = editing
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(255,255,255,0.05)";
                }}
              />
            </div>
            {/* Date of Birth */}
            <div>
              <label style={labelStyle}>Date of Birth</label>
              <DateInput
                ariaLabel="Date of birth"
                max={today}
                value={form.dateOfBirth}
                onChange={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))}
                disabled={!editing}
                style={inputStyle(!editing)}
              />
            </div>
            {/* Gender */}
            <div>
              <label style={labelStyle}>Gender</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                disabled={!editing}
                style={{ ...inputStyle(!editing), appearance: "none" }}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="preferNotToSay">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* Bio */}
          <div style={{ marginTop: "14px" }}>
            <label style={labelStyle}>
              Bio{" "}
              <span
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontWeight: "400",
                  textTransform: "none",
                  letterSpacing: 0,
                  fontSize: "13px",
                }}
              >
                ({200 - (form.bio?.length || 0)} chars remaining)
              </span>
            </label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              disabled={!editing}
              placeholder="Tell us about yourself..."
              maxLength={200}
              rows={3}
              style={{
                ...inputStyle(!editing),
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: "1.6",
              }}
              onFocus={(e) => {
                if (editing) e.target.style.borderColor = "#f3d400";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = editing
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(255,255,255,0.05)";
              }}
            />
          </div>
        </div>

        {/* Account info (read-only) */}
        <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />
        <div>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "700",
              color: "rgba(255,255,255,0.6)",
              letterSpacing: "1px",
              textTransform: "uppercase",
              marginBottom: "16px",
            }}
          >
            Account Information
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
            }}
          >
            <div>
              <label style={labelStyle}>Member ID</label>
              <input
                value={user.userId || "—"}
                disabled
                style={inputStyle(true)}
              />
            </div>
            <div>
              <label style={labelStyle}>Account Role</label>
              <input
                value={user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                disabled
                style={inputStyle(true)}
              />
            </div>
            <div>
              <label style={labelStyle}>Member Since</label>
              <input
                value={new Date(user.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                disabled
                style={inputStyle(true)}
              />
            </div>
            <div>
              <label style={labelStyle}>Email Verified</label>
              <input
                value={user.isEmailVerified ? "✓ Verified" : "✗ Not Verified"}
                disabled
                style={{
                  ...inputStyle(true),
                  color: user.isEmailVerified ? "#22c55e" : "#ef4444",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {user.role !== "admin" && <DeleteAccountSection />}
    </div>
  );
}
