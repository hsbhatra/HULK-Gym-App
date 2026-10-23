import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";
import {
  getSessions,
  logoutUser,
  logoutAllDevices,
} from "../../services/authService.js";
import ConfirmDialog from "../ui/ConfirmDialog.jsx";
import toast from "react-hot-toast";
import { Globe, Laptop, Monitor, Smartphone } from "lucide-react";
import { Tip } from "../ui/Tip.jsx";

export default function SessionsSection({ onLogout }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null); // { type: 'single'|'all', sessionId? }
  const [revoking, setRevoking] = useState(null);
  const navigate = useNavigate();
  const storeLogout = useAuthStore((s) => s.logout);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await getSessions();
      setSessions(res.data.data.sessions);
    } catch {
      toast.error("Failed to load sessions.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeOne = async (sessionId) => {
    setRevoking(sessionId);
    setConfirm(null);
    try {
      await logoutUser();
      storeLogout({ manual: true });
      toast.success("Session ended. Please log in again.");
      navigate("/login");
    } catch {
      toast.error("Failed to end session.");
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    setConfirm(null);
    try {
      await logoutAllDevices();
      storeLogout({ manual: true });
      toast.success("Logged out from all devices.");
      navigate("/login");
    } catch {
      toast.error("Failed to logout from all devices.");
    }
  };

  const deviceIcon = (deviceName = "") => {
    if (/iphone|ipad|ios/i.test(deviceName)) return <Smartphone size={22} aria-hidden="true" />;
    if (/android/i.test(deviceName)) return <Smartphone size={22} aria-hidden="true" />;
    if (/mac/i.test(deviceName)) return <Laptop size={22} aria-hidden="true" />;
    if (/windows/i.test(deviceName)) return <Monitor size={22} aria-hidden="true" />;
    return <Globe size={22} aria-hidden="true" />;
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div>
      {confirm && (
        <ConfirmDialog
          message={
            confirm.type === "all"
              ? "This will log you out from ALL devices immediately. You'll need to sign in again on each device."
              : "This will end the current session and log you out immediately."
          }
          onConfirm={() =>
            confirm.type === "all"
              ? handleRevokeAll()
              : handleRevokeOne(confirm.sessionId)
          }
          onCancel={() => setConfirm(null)}
        />
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <div>
          <h2 className="page-title page-title--sm">
            Active Sessions
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.62)" }}>
            {sessions.length} device{sessions.length !== 1 ? "s" : ""} currently
            signed in
          </p>
        </div>
        <button
          onClick={() => setConfirm({ type: "all" })}
          style={{
            padding: "9px 18px",
            borderRadius: "9px",
            border: "1px solid rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.08)",
            color: "#ef4444",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Logout All Devices
        </button>
      </div>

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          <div
            className="spinner"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              borderTopColor: "#f3d400",
              margin: "0 auto 12px",
            }}
          />
          Loading sessions...
        </div>
      ) : sessions.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          No active sessions found.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {sessions.map((s) => (
            <div
              key={s._id}
              className="session-card"
              style={{
                background: s.isCurrent
                  ? "rgba(243,212,0,0.05)"
                  : "rgba(255,255,255,0.02)",
                border: `1px solid ${s.isCurrent ? "rgba(243,212,0,0.2)" : "rgba(255,255,255,0.05)"}`,
              }}
            >
              {/* Device Icon */}
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  flexShrink: 0,
                  background: s.isCurrent
                    ? "rgba(243,212,0,0.1)"
                    : "rgba(255,255,255,0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                }}
              >
                {deviceIcon(s.deviceInfo?.deviceName)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {s.deviceInfo?.deviceName || "Unknown Device"}
                  </span>
                  {s.isCurrent && (
                    <span
                      style={{
                        fontSize: "12px",
                        padding: "2px 8px",
                        borderRadius: "100px",
                        background: "rgba(243,212,0,0.15)",
                        color: "#f3d400",
                        fontWeight: "700",
                        letterSpacing: "0.5px",
                        flexShrink: 0,
                      }}
                    >
                      THIS DEVICE
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    {s.deviceInfo?.platform || "Unknown"}
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    {s.deviceInfo?.ipAddress || "—"}
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    Last active {timeAgo(s.lastUsedAt)}
                  </span>
                </div>
              </div>

              {/* End Session */}
              <Tip text="Signs this device out. Your other devices stay signed in."><button
                className="session-end-btn"
                onClick={() => setConfirm({ type: "single", sessionId: s._id })}
                disabled={revoking === s._id}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  flexShrink: 0,
                  border: "1px solid rgba(239,68,68,0.2)",
                  background: "transparent",
                  color: "#ef4444",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(239,68,68,0.08)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {revoking === s._id ? "Ending..." : "End Session"}
              </button></Tip>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
