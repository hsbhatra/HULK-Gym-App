// =============================================================================
// src/pages/admin/AdminMembersPage.jsx
// =============================================================================

import { useState, useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Modal from "../../components/ui/Modal.jsx";
import AdminLayout from "../../components/layout/AdminLayout.jsx";
import api from "../../services/api.js";
import ReceiptsList from "../../components/ui/ReceiptsList.jsx";
import Paged from "../../components/ui/Paged.jsx";
import MemberIdPanel from "../../components/admin/MemberIdPanel.jsx";
import MarkInstallmentModal from "../../components/admin/MarkInstallmentModal.jsx";
import CollectBalanceForm from "../../components/admin/CollectBalanceForm.jsx";
import RecordPaymentForm from "../../components/admin/RecordPaymentForm.jsx";
import MemberFilterBar, { readFilters, writeParams, apiParams } from "../../components/admin/MemberFilterBar.jsx";
import { Search, TriangleAlert } from "lucide-react";
import { Tip, InfoTip } from "../../components/ui/Tip.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import { useAuthStore } from "../../store/authStore.js";
import { isAdminUser, roleLabel } from "../../utils/roles.js";
import { inr, formatDate, subscriptionStatusColor } from "../../utils/format.js";

const ITEMS_PER_PAGE = 10;

// =============================================================================
// AdminMembersPage
// =============================================================================

export default function AdminMembersPage() {
  // Who is using this page. The server enforces every limit again; this only
  // hides what a receptionist can't do (cancel, complimentary, ID number, roles).
  const me = useAuthStore((s) => s.user);
  const isAdmin = isAdminUser(me);
  const [roleDialog, setRoleDialog] = useState(null); // "receptionist" | "member" while confirming
  const [roleBusy, setRoleBusy] = useState(false);

  // ── Search state ────────────────────────────────────────────────────────────
  // Filters, sort and the search text live in the page URL (?status=…&sort=…),
  // so a refresh or the Back button keeps the same view.
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, sort, query: urlQuery } = useMemo(() => readFilters(searchParams), [searchParams]);
  const [query, setQuery] = useState(urlQuery); // what is typed in the box
  const [members, setMembers] = useState([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [page, setPage] = useState(1);
  const [searching, setSearching] = useState(false);
  const [filterPlans, setFilterPlans] = useState([]); // every plan, for the plan filter

  // ── Detail panel state ──────────────────────────────────────────────────────
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberDetail, setMemberDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [plans, setPlans] = useState([]);

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [markingInstallment, setMarkingInstallment] = useState(null);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [collectBalanceModal, setCollectBalanceModal] = useState(null);

  // Escape closes whichever popup is open
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setCollectBalanceModal(null);
      setMarkingInstallment(null);
      setCancelDialog(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Search ──────────────────────────────────────────────────────────────────
  const updateView = (next) => {
    setPage(1);
    setSearchParams(writeParams({ filters, sort, query: urlQuery, ...next }), { replace: true });
  };

  // Typing waits a moment before searching; the URL follows the typed text
  useEffect(() => {
    if (query === urlQuery) return undefined;
    const t = setTimeout(() => updateView({ query }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    api.get("/admin/plans").then((res) => setFilterPlans(res.data.data.plans || [])).catch(() => {});
  }, []);

  // One request per change; an older, slower answer never overwrites a newer one
  const requestId = useRef(0);
  const viewKey = `${urlQuery}|${filters.status}|${filters.plan}|${filters.dues}|${filters.idMissing}|${sort}|${page}`;
  const loadMembers = async () => {
    const mine = ++requestId.current;
    setSearching(true);
    try {
      const res = await api.get(`/admin/members?${apiParams({ filters, sort, query: urlQuery, page, limit: ITEMS_PER_PAGE })}`);
      if (mine !== requestId.current) return;
      setMembers(res.data.data.members);
      setTotalMembers(res.data.data.total || 0);
    } catch (err) {
      if (mine === requestId.current) toast.error(err.response?.data?.message || "Search failed.");
    } finally {
      if (mine === requestId.current) setSearching(false);
    }
  };
  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey]);

  const handleQueryChange = (value) => setQuery(value);
  const handlePageChange = (newPage) => setPage(newPage);

  // ── Member detail ────────────────────────────────────────────────────────────
  // /admin/members/:id opens that member directly (used by dashboard links)
  const { id: routeMemberId } = useParams();
  useEffect(() => {
    if (routeMemberId) loadMemberDetail({ _id: routeMemberId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeMemberId]);

  const loadMemberDetail = async (member) => {
    setSelectedMember(member);
    setLoadingDetail(true);
    try {
      const [memberRes, plansRes] = await Promise.all([
        api.get(`/admin/members/${member._id}`),
        api.get("/admin/plans"),
      ]);
      setMemberDetail(memberRes.data.data);
      // Deep links pass only { _id } — fill in name etc. for headers/dialogs
      setSelectedMember((prev) => ({ ...memberRes.data.data.user, ...prev, ...memberRes.data.data.user }));
      setPlans(plansRes.data.data.plans.filter((p) => p.status === "active"));
    } catch {
      toast.error("Failed to load member details.");
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── Receptionist role (admin only) ───────────────────────────────────────────
  const changeRole = async () => {
    if (roleBusy) return;
    setRoleBusy(true);
    try {
      const res = await api.patch(`/admin/members/${memberDetail.user._id}/role`, { role: roleDialog });
      toast.success(res.data.message);
      setRoleDialog(null);
      loadMemberDetail(selectedMember);
      loadMembers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not change the role.");
    } finally {
      setRoleBusy(false);
    }
  };

  // ── Cancel subscription ──────────────────────────────────────────────────────
  const handleCancelSubscription = async () => {
    try {
      await api.patch(
        `/admin/subscriptions/${memberDetail.activeSubscription._id}/cancel`,
        {
          reason: cancelReason || "Cancelled by admin",
        },
      );
      toast.success("Subscription cancelled.");
      setCancelDialog(false);
      setCancelReason("");
      loadMemberDetail(selectedMember);
    } catch {
      toast.error("Failed to cancel subscription.");
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const statusColor = (status) => subscriptionStatusColor(status, { admin: true });

  const totalPages = Math.ceil(totalMembers / ITEMS_PER_PAGE);

  // A receptionist can't record money on their own membership (server refuses too)
  const ownAccount = !isAdmin && !!memberDetail && memberDetail.user?._id === me?._id;

  return (
    <AdminLayout>
      {/* Modals */}
      <AnimatePresence>
      {showPaymentForm && selectedMember && (
        <RecordPaymentForm
          member={selectedMember}
          plans={plans}
          canComplimentary={isAdmin}
          onSuccess={() => loadMemberDetail(selectedMember)}
          onCancel={() => setShowPaymentForm(false)}
        />
      )}

      {roleDialog && memberDetail && (
        <ConfirmDialog
          message={
            roleDialog === "receptionist"
              ? `Make ${memberDetail.user.firstName} ${memberDetail.user.lastName} a receptionist? They will be signed out and must sign in again to see the staff panel.`
              : `Remove ${memberDetail.user.firstName}'s receptionist role? They will be signed out and lose staff access immediately.`
          }
          confirmLabel={roleDialog === "receptionist" ? "Yes, make receptionist" : "Yes, remove role"}
          danger={roleDialog !== "receptionist"}
          onConfirm={changeRole}
          onCancel={() => setRoleDialog(null)}
        />
      )}

      {markingInstallment && (
        <MarkInstallmentModal
          installment={markingInstallment}
          onClose={() => setMarkingInstallment(null)}
          onSaved={() => loadMemberDetail(selectedMember)}
        />
      )}

      {collectBalanceModal && (
        <Modal label="Collect outstanding balance" zIndex={300} maxWidth="400px" backdrop="rgba(0,0,0,0.8)" onBackdropClick={() => setCollectBalanceModal(null)}>
            <h3 style={{ fontSize: "19px", fontWeight: "700", marginBottom: "6px" }}>
              Collect Outstanding Balance
            </h3>
            <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.62)", marginBottom: "20px" }}>
              Paid {inr(collectBalanceModal.payment.amountPaid)} of {inr(collectBalanceModal.payment.amountDue)}
            </p>
            <CollectBalanceForm
              subscription={collectBalanceModal.subscription}
              payment={collectBalanceModal.payment}
              onSuccess={() => {
                setCollectBalanceModal(null);
                loadMemberDetail(selectedMember);
              }}
              onCancel={() => setCollectBalanceModal(null)}
            />
        </Modal>
      )}

      {cancelDialog && (
        <Modal label="Cancel membership" zIndex={200} maxWidth="420px" padding="clamp(20px, 6vw, 36px)" panelStyle={{ textAlign: "center" }}>
            <div style={{ marginBottom: "16px" }}><TriangleAlert size={36} color="var(--yellow)" aria-hidden="true" /></div>
            <h3
              style={{
                fontSize: "19px",
                fontWeight: "700",
                marginBottom: "12px",
              }}
            >
              Cancel Membership?
            </h3>
            <p
              style={{
                fontSize: "16px",
                color: "rgba(255,255,255,0.5)",
                marginBottom: "20px",
                lineHeight: "1.6",
              }}
            >
              {selectedMember?.firstName}'s membership ends immediately. Any
              unpaid installments will be waived.
            </p>
            <textarea
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "10px 14px",
                color: "#fff",
                fontSize: "15px",
                resize: "vertical",
                marginBottom: "20px",
                outline: "none",
              }}
              rows={2}
            />
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => {
                  setCancelDialog(false);
                  setCancelReason("");
                }}
                className="btn-ghost"
                style={{ flex: 1, padding: "12px" }}
              >
                No, keep it
              </button>
              <button
                onClick={handleCancelSubscription}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#ef4444",
                  color: "#fff",
                  fontWeight: "600",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                Yes, cancel
              </button>
            </div>
        </Modal>
      )}
      </AnimatePresence>

      {/* Mobile: one column; when a member is open show only the detail */}
      <style>{`
        .members-back { display: none; }
        @media (max-width: 900px) {
          .members-layout { grid-template-columns: 1fr !important; }
          .members-layout.has-selection .members-list { display: none; }
          .members-back { display: inline-flex; }
        }
      `}</style>

      {/* Layout */}
      <div
        className={`members-layout${selectedMember ? " has-selection" : ""}`}
        style={{
          display: "grid",
          gridTemplateColumns: selectedMember ? "340px 1fr" : "1fr",
          gap: "24px",
          minHeight: "calc(100vh - 120px)",
        }}
      >
        {/* Left — Member List */}
        <div className="members-list" style={{ minWidth: 0 }}>
          <h1 className="page-title" style={{ marginBottom: "20px" }}>
            Members
          </h1>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <input
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                padding: "12px 40px 12px 40px",
                color: "#fff",
                fontSize: "16px",
                outline: "none",
              }}
              placeholder="Search by name, email, phone, ID..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
            />
            <span
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.55)",
                fontSize: "17px",
                pointerEvents: "none",
              }}
            >
              <Search size={16} aria-hidden="true" />
            </span>
            {query && (
              <button aria-label="Clear search"
                onClick={() => handleQueryChange("")}
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.55)",
                  cursor: "pointer",
                  fontSize: "17px",
                }}
              >
                ✕
              </button>
            )}
          </div>

          <MemberFilterBar
            filters={filters}
            sort={sort}
            plans={filterPlans}
            total={totalMembers}
            onFilters={(f) => updateView({ filters: f })}
            onSort={(v) => updateView({ sort: v })}
          />

          {/* Count */}
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.55)",
              marginBottom: "12px",
            }}
          >
            {searching
              ? "Searching..."
              : `${totalMembers} member${totalMembers !== 1 ? "s" : ""} found`}
          </p>

          {/* List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {members.length === 0 && !searching ? (
              <p
                style={{
                  fontSize: "15px",
                  color: "rgba(255,255,255,0.55)",
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                No members found.
              </p>
            ) : (
              members.map((m) => (
                <div
                  key={m._id}
                  onClick={() => loadMemberDetail(m)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    background:
                      selectedMember?._id === m._id
                        ? "rgba(243,212,0,0.08)"
                        : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selectedMember?._id === m._id ? "rgba(243,212,0,0.2)" : "rgba(255,255,255,0.05)"}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    {m.profilePicture ? (
                      <img
                        src={m.profilePicture}
                        alt=""
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: "rgba(243,212,0,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#f3d400",
                          fontWeight: "700",
                          flexShrink: 0,
                        }}
                      >
                        {m.firstName[0]}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {m.firstName} {m.lastName}
                      </p>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "rgba(255,255,255,0.62)",
                        }}
                      >
                        {m.userId} · {m.phoneNumber}
                        {m.role === "receptionist" && (
                          <span style={{ marginLeft: "8px", fontSize: "11px", fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase", padding: "2px 8px", borderRadius: "999px", background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>
                            Receptionist
                          </span>
                        )}
                      </p>
                      {m.membership && (
                        <p style={{ fontSize: "13px", display: "flex", flexWrap: "wrap", gap: "4px 10px", alignItems: "center", marginTop: "2px" }}>
                          <span style={{ fontWeight: 700, color: statusColor(m.membership.status), textTransform: "capitalize" }}>
                            {m.membership.status === "none" ? "No membership" : m.membership.status}
                          </span>
                          {m.membership.planName && <span style={{ color: "rgba(255,255,255,0.62)" }}>{m.membership.planName}</span>}
                          {m.membership.endDate && m.membership.status !== "none" && (
                            <span style={{ color: "rgba(255,255,255,0.62)" }}>till {formatDate(m.membership.endDate)}</span>
                          )}
                          {m.duesPaise > 0 && <span style={{ color: "#f97316", fontWeight: 700 }}>{inr(m.duesPaise)} due</span>}
                          {m.overdueCount > 0 && <span style={{ color: "var(--ember)", fontWeight: 700 }}>Overdue</span>}
                        </p>
                      )}
                      {m.idStatus?.state !== "saved" && (
                        <p style={{ fontSize: "13px", color: "#e5482b", fontWeight: "600" }}>
                          ID not added
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                marginTop: "16px",
              }}
            >
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color:
                    page === 1
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(255,255,255,0.6)",
                  cursor: page === 1 ? "not-allowed" : "pointer",
                  fontSize: "15px",
                }}
              >
                ← Prev
              </button>
              <span
                style={{ fontSize: "15px", color: "rgba(255,255,255,0.62)" }}
              >
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color:
                    page === totalPages
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(255,255,255,0.6)",
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                  fontSize: "15px",
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Right — Member Detail */}
        {selectedMember && (
          <div style={{ minWidth: 0 }}>
            <button
              className="members-back"
              onClick={() => {
                setSelectedMember(null);
                setMemberDetail(null);
              }}
              style={{
                marginBottom: "16px", padding: "8px 14px", borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
                color: "rgba(255,255,255,0.6)", fontSize: "15px", cursor: "pointer",
              }}
            >
              ← All members
            </button>
            {loadingDetail ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                Loading...
              </div>
            ) : memberDetail ? (
              <>
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "24px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        width: "52px",
                        height: "52px",
                        borderRadius: "50%",
                        background: "rgba(243,212,0,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#f3d400",
                        fontSize: "20px",
                        fontWeight: "700",
                        flexShrink: 0,
                      }}
                    >
                      {memberDetail.user.firstName[0]}
                    </div>
                    <div>
                      <h2 style={{ fontSize: "19px", fontWeight: "700" }}>
                        {memberDetail.user.firstName}{" "}
                        {memberDetail.user.lastName}
                      </h2>
                      <p
                        style={{
                          fontSize: "15px",
                          color: "rgba(255,255,255,0.62)",
                        }}
                      >
                        {memberDetail.user.userId} · {memberDetail.user.email}
                      </p>
                      {memberDetail.user.role === "receptionist" && (
                        <span style={{ display: "inline-block", marginTop: "4px", fontSize: "12px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", padding: "3px 10px", borderRadius: "999px", background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.35)" }}>
                          Receptionist
                        </span>
                      )}
                    </div>
                  </div>
                  <Tip text={ownAccount ? "You can't record payments on your own membership. Ask the admin." : memberDetail.activeSubscription ? "This member already has an active plan. Collect any balance, or cancel the plan first." : null}><button
                    onClick={() => setShowPaymentForm(true)}
                    className="btn-gold"
                    // One active plan per member (backend enforces it) — say so
                    // up front instead of after the admin fills the whole form.
                    disabled={!!memberDetail.activeSubscription || ownAccount}
                    style={{
                      width: "auto",
                      padding: "10px 20px",
                      fontSize: "15px",
                      flexShrink: 0,
                      opacity: memberDetail.activeSubscription || ownAccount ? 0.45 : 1,
                      cursor: memberDetail.activeSubscription || ownAccount ? "not-allowed" : "pointer",
                    }}
                  >
                    + New Membership
                  </button></Tip>
                </div>

                {/* Receptionist access — admin only */}
                {isAdmin && memberDetail.user._id !== me?._id && ["member", "receptionist"].includes(memberDetail.user.role) && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                      padding: "14px 16px",
                      marginBottom: "20px",
                      borderRadius: "14px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                      <p style={{ fontSize: "15px", fontWeight: "700" }}>
                        Receptionist access{" "}
                        <InfoTip text="A receptionist can sign in to the staff panel to search members, record desk payments and unlock ID entry. They can't cancel memberships, give free memberships, see ID numbers, change plans or see revenue." />
                      </p>
                      <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.62)", marginTop: "2px" }}>
                        {memberDetail.user.role === "receptionist"
                          ? "This member works at the front desk."
                          : "Give desk access to this member."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRoleDialog(memberDetail.user.role === "receptionist" ? "member" : "receptionist")}
                      className={memberDetail.user.role === "receptionist" ? "btn-ghost btn-sm" : "btn-gold btn-sm"}
                      style={{ width: "auto", minHeight: "44px", padding: "8px 16px", flexShrink: 0 }}
                    >
                      {memberDetail.user.role === "receptionist" ? "Remove receptionist role" : "Make receptionist"}
                    </button>
                  </div>
                )}

                {/* Government ID (hidden until "Show ID number") */}
                <MemberIdPanel key={memberDetail.user._id} member={memberDetail.user} canReveal={isAdmin} />

                {/* Active Subscription */}
                <div style={{ marginBottom: "20px" }}>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "rgba(255,255,255,0.62)",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      marginBottom: "12px",
                    }}
                  >
                    Current Membership
                  </p>

                  {memberDetail.activeSubscription ? (
                    <div
                      style={{
                        padding: "clamp(14px, 4vw, 20px)",
                        borderRadius: "14px",
                        background: "rgba(34,197,94,0.04)",
                        border: "1px solid rgba(34,197,94,0.15)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                          gap: "12px",
                          marginBottom: "16px",
                        }}
                      >
                        <div>
                          <p style={{ fontSize: "17px", fontWeight: "700" }}>
                            {
                              memberDetail.activeSubscription.planSnapshot
                                .planName
                            }
                          </p>
                          <p
                            style={{
                              fontSize: "15px",
                              color: "rgba(255,255,255,0.62)",
                            }}
                          >
                            {
                              memberDetail.activeSubscription.planSnapshot
                                .durationLabel
                            }{" "}
                            · Expires{" "}
                            {formatDate(
                              memberDetail.activeSubscription.endDate,
                            )}
                          </p>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "13px",
                              padding: "3px 10px",
                              borderRadius: "100px",
                              background: "rgba(34,197,94,0.1)",
                              border: "1px solid rgba(34,197,94,0.2)",
                              color: "#22c55e",
                              fontWeight: "700",
                              textTransform: "uppercase",
                            }}
                          >
                            Active
                          </span>
                          
                          {/* Show Collect Balance button only when balance exists */}
                          {(() => {
                            const payment = memberDetail.paymentHistory?.find(
                              (p) =>
                                p.subscriptionId?.toString() ===
                                memberDetail.activeSubscription._id?.toString(),
                            );
                            const hasBalance =
                              payment && payment.status === "partial" && !ownAccount;
                            return hasBalance ? (
                              <Tip text="Record money this member still owes on their plan. It goes to the earliest unpaid installments and a receipt is emailed to them."><button
                                onClick={() =>
                                  setCollectBalanceModal({
                                    subscription:
                                      memberDetail.activeSubscription,
                                    payment,
                                  })
                                }
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "8px",
                                  border: "1px solid rgba(243,212,0,0.2)",
                                  background: "rgba(243,212,0,0.08)",
                                  color: "#f3d400",
                                  fontSize: "14px",
                                  cursor: "pointer",
                                }}
                              >
                                Collect Balance
                              </button></Tip>
                            ) : null;
                          })()}
                          
                          {isAdmin && <Tip text="Ends this membership now and drops any unpaid installments. Money already paid is not refunded by this button."><button
                            onClick={() => setCancelDialog(true)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              border: "1px solid rgba(239,68,68,0.2)",
                              background: "transparent",
                              color: "#ef4444",
                              fontSize: "14px",
                              cursor: "pointer",
                            }}
                          >
                            Cancel membership
                          </button></Tip>}
                        </div>
                      </div>

                      {/* Payment summary */}
                      {(() => {
                        const payment = memberDetail.paymentHistory?.find(
                          (p) =>
                            p.subscriptionId?.toString() ===
                            memberDetail.activeSubscription._id?.toString(),
                        );
                        const subInstallments = (
                          memberDetail.installments || []
                        ).filter(
                          (i) =>
                            i.subscriptionId?.toString() ===
                            memberDetail.activeSubscription._id?.toString(),
                        );
                        const isPartial = payment?.status === "partial";

                        return (
                          <>
                            <div
                              style={{
                                display: "flex",
                                gap: "24px",
                                flexWrap: "wrap",
                                marginBottom:
                                  subInstallments.length > 0 ? "16px" : "0",
                              }}
                            >
                              <div>
                                <p
                                  style={{
                                    fontSize: "13px",
                                    color: "rgba(255,255,255,0.6)",
                                  }}
                                >
                                  AMOUNT PAID
                                </p>
                                <p
                                  style={{
                                    fontSize: "16px",
                                    fontWeight: "700",
                                    color: "#f3d400",
                                  }}
                                >
                                  {payment?.paymentMode === "complimentary"
                                    ? "Complimentary"
                                    : payment
                                      ? inr(payment.amountPaid)
                                      : "—"}
                                </p>
                              </div>
                              {isPartial && payment && (
                                <div>
                                  <p
                                    style={{
                                      fontSize: "13px",
                                      color: "rgba(255,255,255,0.6)",
                                    }}
                                  >
                                    BALANCE DUE
                                  </p>
                                  <p
                                    style={{
                                      fontSize: "16px",
                                      fontWeight: "700",
                                      color: "#ef4444",
                                    }}
                                  >
                                    {inr(payment.amountDue - payment.amountPaid)}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p
                                  style={{
                                    fontSize: "13px",
                                    color: "rgba(255,255,255,0.6)",
                                  }}
                                >
                                  PAYMENT MODE
                                </p>
                                <p
                                  style={{
                                    fontSize: "16px",
                                    fontWeight: "700",
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {memberDetail.activeSubscription.paymentMode}
                                </p>
                              </div>
                            </div>

                            {/* Installments */}
                            {subInstallments.length > 0 && (
                              <div
                                style={{
                                  borderTop: "1px solid #26262a",
                                  paddingTop: "14px",
                                }}
                              >
                                <p
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    color: "rgba(255,255,255,0.6)",
                                    letterSpacing: "1px",
                                    textTransform: "uppercase",
                                    marginBottom: "10px",
                                  }}
                                >
                                  Installment Schedule
                                </p>
                                {subInstallments.map((inst) => {
                                  const isPaid = inst.status === "paid";
                                  const isOverdue = inst.status === "overdue";
                                  const color = isPaid
                                    ? "#22c55e"
                                    : isOverdue
                                      ? "#ef4444"
                                      : "#f97316";
                                  return (
                                    <div
                                      key={inst._id}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        gap: "8px 12px",
                                        padding: "10px 0",
                                        borderBottom:
                                          "1px solid rgba(255,255,255,0.04)",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "flex-start",
                                          gap: "10px",
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: "16px",
                                            color,
                                            marginTop: "1px",
                                          }}
                                        >
                                          {isPaid ? "✓" : isOverdue ? "!" : "○"}
                                        </span>
                                        <div>
                                          <p
                                            style={{
                                              fontSize: "15px",
                                              fontWeight: "600",
                                            }}
                                          >
                                            Installment {inst.installmentNumber}
                                          </p>
                                          <p
                                            style={{
                                              fontSize: "14px",
                                              color: "rgba(255,255,255,0.6)",
                                              marginTop: "2px",
                                            }}
                                          >
                                            Due: {formatDate(inst.dueDate)}
                                          </p>
                                          {isPaid && (
                                            <p
                                              style={{
                                                fontSize: "14px",
                                                color: "rgba(34,197,94,0.7)",
                                                marginTop: "2px",
                                              }}
                                            >
                                              Paid:{" "}
                                              {inst.paidAt
                                                ? formatDate(inst.paidAt)
                                                : "—"}
                                              {inst.paymentMode &&
                                                ` · ${inst.paymentMode.charAt(0).toUpperCase() + inst.paymentMode.slice(1)}`}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "10px",
                                        }}
                                      >
                                        <div style={{ textAlign: "right" }}>
                                          <p
                                            style={{
                                              fontSize: "15px",
                                              fontWeight: "600",
                                            }}
                                          >
                                            {inr(inst.amountDue)}
                                          </p>
                                          {!isPaid && inst.amountPaid > 0 && (
                                            <p style={{ fontSize: "13px", color: "#22c55e", margin: "2px 0" }}>
                                              {inr(inst.amountPaid)} paid
                                            </p>
                                          )}
                                          <span
                                            style={{
                                              fontSize: "13px",
                                              padding: "2px 8px",
                                              borderRadius: "100px",
                                              background: `${color}18`,
                                              border: `1px solid ${color}33`,
                                              color,
                                              fontWeight: "600",
                                              textTransform: "uppercase",
                                            }}
                                          >
                                            {inst.status}
                                          </span>
                                        </div>
                                        {!isPaid && inst.status !== "waived" && !ownAccount && (
                                          <Tip text="Record that what is left of this installment was paid at the desk. You see a summary first; then a receipt is emailed to the member."><button
                                            onClick={() =>
                                              setMarkingInstallment(inst)
                                            }
                                            style={{
                                              padding: "5px 10px",
                                              borderRadius: "6px",
                                              border:
                                                "1px solid rgba(243,212,0,0.2)",
                                              background:
                                                "rgba(243,212,0,0.08)",
                                              color: "#f3d400",
                                              fontSize: "13px",
                                              cursor: "pointer",
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            Mark Paid
                                          </button></Tip>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "clamp(14px, 4vw, 20px)",
                        borderRadius: "14px",
                        background: "var(--iron-850)",
                        border: "1px dashed rgba(255,255,255,0.1)",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "15px",
                          color: "rgba(255,255,255,0.6)",
                        }}
                      >
                        No active membership
                      </p>
                      <button
                        onClick={() => setShowPaymentForm(true)}
                        style={{
                          marginTop: "12px",
                          padding: "8px 18px",
                          borderRadius: "8px",
                          border: "1px solid rgba(243,212,0,0.2)",
                          background: "rgba(243,212,0,0.08)",
                          color: "#f3d400",
                          fontSize: "15px",
                          cursor: "pointer",
                        }}
                      >
                        + Assign Plan
                      </button>
                    </div>
                  )}
                </div>

                {/* Cancellation info */}
                {memberDetail.subscriptionHistory?.find(
                  (s) => s.status === "cancelled" && s.cancelReason,
                ) &&
                  (() => {
                    const cancelled = memberDetail.subscriptionHistory.find(
                      (s) => s.status === "cancelled",
                    );
                    return cancelled?.cancelReason ? (
                      <div
                        style={{
                          padding: "14px 16px",
                          borderRadius: "12px",
                          marginBottom: "20px",
                          background: "rgba(239,68,68,0.05)",
                          border: "1px solid rgba(239,68,68,0.15)",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: "700",
                            color: "rgba(255,255,255,0.62)",
                            letterSpacing: "1px",
                            textTransform: "uppercase",
                            marginBottom: "6px",
                          }}
                        >
                          Last Cancellation Reason
                        </p>
                        <p
                          style={{
                            fontSize: "15px",
                            color: "rgba(255,255,255,0.6)",
                          }}
                        >
                          {cancelled.cancelReason}
                        </p>
                        {cancelled.cancelledAt && (
                          <p
                            style={{
                              fontSize: "14px",
                              color: "rgba(255,255,255,0.55)",
                              marginTop: "4px",
                            }}
                          >
                            {formatDate(cancelled.cancelledAt)}
                          </p>
                        )}
                      </div>
                    ) : null;
                  })()}

                {/* Receipts — one per payment received */}
                {memberDetail.receipts?.length > 0 && (
                  <div style={{ marginBottom: "24px" }}>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "rgba(255,255,255,0.62)",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        marginBottom: "12px",
                      }}
                    >
                      Payments &amp; Receipts
                    </p>
                    <ReceiptsList key={memberDetail.user?._id} receipts={memberDetail.receipts} />
                  </div>
                )}

                {/* Subscription History */}
                {memberDetail.subscriptionHistory?.length > 0 && (
                  <div>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "rgba(255,255,255,0.62)",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        marginBottom: "12px",
                      }}
                    >
                      Subscription History
                    </p>
                    <Paged
                      key={memberDetail.user?._id}
                      items={memberDetail.subscriptionHistory}
                    >
                      {(sub) => (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "14px 16px",
                            borderRadius: "10px",
                            background: "var(--iron-850)",
                            border: "1px solid #26262a",
                          }}
                        >
                          <div>
                            <p style={{ fontSize: "16px", fontWeight: "600" }}>
                              {sub.planSnapshot.planName} —{" "}
                              {sub.planSnapshot.durationLabel}
                            </p>
                            <p
                              style={{
                                fontSize: "14px",
                                color: "rgba(255,255,255,0.6)",
                                marginTop: "2px",
                              }}
                            >
                              {formatDate(sub.startDate)} →{" "}
                              {formatDate(sub.endDate)}
                            </p>
                            {sub.cancelReason && (
                              <p
                                style={{
                                  fontSize: "14px",
                                  color: "rgba(239,68,68,0.7)",
                                  marginTop: "2px",
                                }}
                              >
                                ↳ {sub.cancelReason}
                              </p>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: "13px",
                              padding: "3px 10px",
                              borderRadius: "100px",
                              border: `1px solid ${statusColor(sub.status)}33`,
                              color: statusColor(sub.status),
                              fontWeight: "700",
                              textTransform: "uppercase",
                              flexShrink: 0,
                            }}
                          >
                            {sub.status}
                          </span>
                        </div>
                      )}
                    </Paged>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
