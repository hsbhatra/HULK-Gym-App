import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";
import { changePassword } from "../../services/authService.js";
import ConfirmDialog from "../ui/ConfirmDialog.jsx";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { inputStyle as baseInput, labelStyle } from "../ui/formStyles.js";

export default function ChangePasswordSection() {
  const navigate = useNavigate();
  const storeLogout = useAuthStore((s) => s.logout);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [formData, setFormData] = useState(null);

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.currentPassword)
      e.currentPassword = "Current password is required";
    if (!form.newPassword) e.newPassword = "New password is required";
    else if (form.newPassword.length < 8)
      e.newPassword = "Minimum 8 characters";
    else if (!/[A-Z]/.test(form.newPassword))
      e.newPassword = "Must contain an uppercase letter";
    else if (!/\d/.test(form.newPassword))
      e.newPassword = "Must contain a number";
    else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.newPassword))
      e.newPassword = "Must contain a special character";
    if (!form.confirmNewPassword)
      e.confirmNewPassword = "Please confirm your new password";
    else if (form.newPassword !== form.confirmNewPassword)
      e.confirmNewPassword = "Passwords do not match";
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setFormData(form);
    setConfirm(true);
  };

  const handleConfirmedChange = async () => {
    setConfirm(false);
    setLoading(true);
    try {
      await changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmNewPassword: formData.confirmNewPassword,
      });
      toast.success("Password changed! Please log in again.");
      storeLogout({ manual: true });
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { ...baseInput, border: "1px solid rgba(255,255,255,0.08)", padding: "11px 44px 11px 14px", transition: "border-color 0.2s" };

  const EyeBtn = ({ show, toggle }) => (
    <button
      type="button"
      onClick={toggle}
      style={{
        position: "absolute",
        right: "14px",
        top: "50%",
        transform: "translateY(-50%)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: "rgba(255,255,255,0.6)",
        fontSize: "16px",
        padding: "4px",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#f3d400")}
      onMouseLeave={(e) =>
        (e.currentTarget.style.color = "#8c8c86")
      }
    >
      {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}<span className="sr-only">{show ? "Hide password" : "Show password"}</span>
    </button>
  );

  return (
    <div style={{ maxWidth: "480px" }}>
      {confirm && (
        <ConfirmDialog
          message="Are you sure you want to change your password? You will be logged out and need to sign in again with your new password."
          onConfirm={handleConfirmedChange}
          onCancel={() => setConfirm(false)}
        />
      )}

      <h2 className="page-title page-title--sm">
        Change Password
      </h2>
      <p
        style={{
          fontSize: "15px",
          color: "rgba(255,255,255,0.62)",
          marginBottom: "28px",
          lineHeight: "1.6",
        }}
      >
        After changing your password you will be logged out and need to sign in
        again.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "18px" }}
      >
        {/* Current Password */}
        <div>
          <label style={labelStyle}>Current Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showCurrent ? "text" : "password"}
              placeholder="Enter current password"
              style={{
                ...inputStyle,
                ...(errors.currentPassword
                  ? { borderColor: "rgba(239,68,68,0.5)" }
                  : {}),
              }}
              value={form.currentPassword}
              onChange={(e) =>
                setForm({ ...form, currentPassword: e.target.value })
              }
              onFocus={(e) => (e.target.style.borderColor = "#f3d400")}
              onBlur={(e) =>
                (e.target.style.borderColor = errors.currentPassword
                  ? "rgba(239,68,68,0.5)"
                  : "rgba(255,255,255,0.08)")
              }
            />
            <EyeBtn
              show={showCurrent}
              toggle={() => setShowCurrent(!showCurrent)}
            />
          </div>
          {errors.currentPassword && (
            <p style={{ fontSize: "14px", color: "#ef4444", marginTop: "6px" }}>
              {errors.currentPassword}
            </p>
          )}
        </div>

        {/* New Password */}
        <div>
          <label style={labelStyle}>New Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showNew ? "text" : "password"}
              placeholder="Enter new password"
              style={{
                ...inputStyle,
                ...(errors.newPassword
                  ? { borderColor: "rgba(239,68,68,0.5)" }
                  : {}),
              }}
              value={form.newPassword}
              onChange={(e) =>
                setForm({ ...form, newPassword: e.target.value })
              }
              onFocus={(e) => (e.target.style.borderColor = "#f3d400")}
              onBlur={(e) =>
                (e.target.style.borderColor = errors.newPassword
                  ? "rgba(239,68,68,0.5)"
                  : "rgba(255,255,255,0.08)")
              }
            />
            <EyeBtn show={showNew} toggle={() => setShowNew(!showNew)} />
          </div>
          {errors.newPassword && (
            <p style={{ fontSize: "14px", color: "#ef4444", marginTop: "6px" }}>
              {errors.newPassword}
            </p>
          )}
        </div>

        {/* Confirm New Password */}
        <div>
          <label style={labelStyle}>Confirm New Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat new password"
              style={{
                ...inputStyle,
                ...(errors.confirmNewPassword
                  ? { borderColor: "rgba(239,68,68,0.5)" }
                  : {}),
              }}
              value={form.confirmNewPassword}
              onChange={(e) =>
                setForm({ ...form, confirmNewPassword: e.target.value })
              }
              onFocus={(e) => (e.target.style.borderColor = "#f3d400")}
              onBlur={(e) =>
                (e.target.style.borderColor = errors.confirmNewPassword
                  ? "rgba(239,68,68,0.5)"
                  : "rgba(255,255,255,0.08)")
              }
            />
            <EyeBtn
              show={showConfirm}
              toggle={() => setShowConfirm(!showConfirm)}
            />
          </div>
          {errors.confirmNewPassword && (
            <p style={{ fontSize: "14px", color: "#ef4444", marginTop: "6px" }}>
              {errors.confirmNewPassword}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn-gold"
          disabled={loading}
          style={{
            marginTop: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Changing password...
            </>
          ) : (
            "Change Password →"
          )}
        </button>
      </form>
    </div>
  );
}
