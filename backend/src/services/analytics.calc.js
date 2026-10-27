// =============================================================================
// src/services/analytics.calc.js
// =============================================================================
// Pure number-crunching for the admin analytics (no database, no Express), so
// every figure can be unit-tested. All money is whole paise. Days are IST days.
//
// Definitions (the same words are used on screen):
//   Received        money that came in during the period: every receipt (desk
//                   payments, installments, balance collections, online
//                   payments) + online payments later refunded as duplicates.
//   Refunds         money sent back (refund started during the period).
//   Actual revenue  Received − Refunds.
//   Held for refund duplicate online payments still waiting for a refund
//                   (not counted as revenue, not yet refunded).
// =============================================================================

const DAY = 86400000;
const IST = 19800000; // +05:30 in ms

export const MAX_RANGE_DAYS = 731;

export const ymdIST = (date) => new Date(new Date(date).getTime() + IST).toISOString().slice(0, 10);
export const istStart = (ymd) => new Date(`${ymd}T00:00:00+05:30`);
const addDays = (ymd, n) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);
const isYMD = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
const pct = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);

// ── Range ────────────────────────────────────────────────────────────────────
// Returns an error message string, or the range. Default: last 30 days.
export const parseRange = ({ from, to } = {}, now = new Date()) => {
  const today = ymdIST(now);
  const toYMD = to || today;
  const fromYMD = from || addDays(toYMD, -29);
  if (!isYMD(fromYMD) || !isYMD(toYMD)) return { error: "Dates must be valid (YYYY-MM-DD)." };
  if (fromYMD > toYMD) return { error: "The start date must be on or before the end date." };
  const days = daysBetween(fromYMD, toYMD) + 1;
  if (days > MAX_RANGE_DAYS) return { error: "Choose a range of 2 years or less." };
  const prevTo = addDays(fromYMD, -1);
  const prevFrom = addDays(prevTo, -(days - 1));
  return {
    fromYMD,
    toYMD,
    days,
    start: istStart(fromYMD),
    end: istStart(addDays(toYMD, 1)), // exclusive
    prevFromYMD: prevFrom,
    prevToYMD: prevTo,
    prevStart: istStart(prevFrom),
    prevEnd: istStart(fromYMD),
    bucket: days <= 62 ? "day" : "month",
  };
};

const inRange = (date, start, end) => !!date && new Date(date) >= start && new Date(date) < end;

const bucketKey = (date, bucket) => {
  const d = ymdIST(date);
  return bucket === "month" ? d.slice(0, 7) : d;
};

export const bucketList = (range) => {
  const keys = [];
  if (range.bucket === "day") {
    for (let i = 0; i < range.days; i += 1) keys.push(addDays(range.fromYMD, i));
  } else {
    let y = +range.fromYMD.slice(0, 4);
    let m = +range.fromYMD.slice(5, 7);
    const endKey = range.toYMD.slice(0, 7);
    for (;;) {
      const k = `${y}-${String(m).padStart(2, "0")}`;
      keys.push(k);
      if (k >= endKey) break;
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
  }
  return keys;
};

const MODES = ["cash", "upi", "card"];
const modeOf = (m) => (MODES.includes(m) ? m : "online");

// ── Revenue ──────────────────────────────────────────────────────────────────
/**
 * @param {{receipts:any[], dupPayments:any[]}} data
 *   receipts     {amount, paymentMode, planName, paidAt}
 *   dupPayments  duplicate online payments: {status:"refund_due"|"refunded", amountPaid, paidAt, refund:{amount,initiatedAt}}
 */
export const revenueReport = ({ receipts, dupPayments }, range) => {
  const part = (start, end) => {
    const r = receipts.filter((x) => inRange(x.paidAt, start, end));
    const d = dupPayments.filter((x) => inRange(x.paidAt, start, end));
    const refundedList = dupPayments.filter(
      (x) => x.status === "refunded" && x.refund?.amount > 0 && inRange(x.refund?.initiatedAt || x.paidAt, start, end),
    );
    const received = r.reduce((s, x) => s + x.amount, 0) + d.reduce((s, x) => s + (x.amountPaid || 0), 0);
    const refunds = refundedList.reduce((s, x) => s + x.refund.amount, 0);
    return { r, d, refundedList, received, refunds, net: received - refunds, count: r.length + d.length };
  };
  const cur = part(range.start, range.end);
  const prev = part(range.prevStart, range.prevEnd);

  const sumBy = (rows, keyFn, amtFn) => {
    const m = new Map();
    rows.forEach((x) => {
      const k = keyFn(x);
      const e = m.get(k) || { key: k, amount: 0, count: 0 };
      e.amount += amtFn(x);
      e.count += 1;
      m.set(k, e);
    });
    return [...m.values()].sort((a, b) => b.amount - a.amount);
  };
  const byPlan = sumBy(cur.r, (x) => x.planName || "Other", (x) => x.amount);
  const byMode = sumBy(
    [...cur.r.map((x) => ({ mode: modeOf(x.paymentMode), amt: x.amount })), ...cur.d.map((x) => ({ mode: "online", amt: x.amountPaid || 0 }))],
    (x) => x.mode,
    (x) => x.amt,
  );

  const series = bucketList(range).map((k) => ({ key: k, received: 0, refunds: 0, net: 0 }));
  const at = new Map(series.map((s) => [s.key, s]));
  cur.r.forEach((x) => { const s = at.get(bucketKey(x.paidAt, range.bucket)); if (s) s.received += x.amount; });
  cur.d.forEach((x) => { const s = at.get(bucketKey(x.paidAt, range.bucket)); if (s) s.received += x.amountPaid || 0; });
  cur.refundedList.forEach((x) => { const s = at.get(bucketKey(x.refund?.initiatedAt || x.paidAt, range.bucket)); if (s) s.refunds += x.refund.amount; });
  series.forEach((s) => { s.net = s.received - s.refunds; });

  const held = dupPayments.filter((x) => x.status === "refund_due");
  return {
    received: cur.received,
    refunds: cur.refunds,
    actualRevenue: cur.net,
    payments: cur.count,
    averagePayment: cur.count ? Math.round(cur.received / cur.count) : 0,
    previous: { received: prev.received, refunds: prev.refunds, actualRevenue: prev.net },
    change: { received: pct(cur.received, prev.received), actualRevenue: pct(cur.net, prev.net) },
    heldForRefund: { count: held.length, amount: held.reduce((s, x) => s + (x.amountPaid || 0), 0) },
    byPlan,
    byMode,
    series,
  };
};

// ── Memberships helpers ──────────────────────────────────────────────────────
const isDuplicateSub = (s) => /^Duplicate payment/i.test(s.cancelReason || "");
// A membership that was really given (not an abandoned checkout, not a refunded duplicate)
export const soldSubs = (subs) => subs.filter((s) => s.status !== "pending" && !isDuplicateSub(s));
const soldAt = (s) => new Date(s.activatedAt || s.createdAt || s.startDate);

// Members who held a usable membership on a given day
const activeUsersOn = (sold, date) => {
  const t = new Date(date);
  const set = new Set();
  sold.forEach((s) => {
    if (new Date(s.startDate) <= t && new Date(s.gracePeriodEnds) >= t && !(s.cancelledAt && new Date(s.cancelledAt) <= t)) set.add(String(s.userId));
  });
  return set.size;
};

export const membersReport = ({ users, subs }, range, now = new Date()) => {
  const known = new Set(users.map((u) => String(u._id)));
  const sold = soldSubs(subs).filter((s) => known.has(String(s.userId)));
  const byUser = new Map();
  sold.forEach((s) => { const k = String(s.userId); (byUser.get(k) || byUser.set(k, []).get(k)).push(s); });
  const isRenewal = (s) => (byUser.get(String(s.userId)) || []).some((o) => o !== s && soldAt(o) < soldAt(s));

  const part = (start, end) => {
    const signups = users.filter((u) => inRange(u.createdAt, start, end)).length;
    const inP = sold.filter((s) => inRange(soldAt(s), start, end));
    const paid = inP.filter((s) => s.status !== "complimentary");
    const renewals = paid.filter(isRenewal).length;
    return { signups, inP, paid, renewals, news: paid.length - renewals, complimentary: inP.length - paid.length };
  };
  const cur = part(range.start, range.end);
  const prev = part(range.prevStart, range.prevEnd);

  const series = bucketList(range).map((k) => ({ key: k, signups: 0, newMemberships: 0, renewals: 0, active: 0 }));
  const at = new Map(series.map((s) => [s.key, s]));
  users.filter((u) => inRange(u.createdAt, range.start, range.end)).forEach((u) => { const s = at.get(bucketKey(u.createdAt, range.bucket)); if (s) s.signups += 1; });
  cur.paid.forEach((x) => { const s = at.get(bucketKey(soldAt(x), range.bucket)); if (s) { if (isRenewal(x)) s.renewals += 1; else s.newMemberships += 1; } });
  series.forEach((s) => {
    // active members at the END of the bucket (capped at "now")
    let cut;
    if (range.bucket === "month") {
      const y = +s.key.slice(0, 4), mo = +s.key.slice(5, 7);
      const nk = mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, "0")}-01`;
      cut = new Date(istStart(nk).getTime() - 1);
    } else {
      cut = new Date(istStart(s.key).getTime() + DAY - 1);
    }
    s.active = activeUsersOn(sold, cut > now ? now : cut);
  });

  const liveNow = activeUsersOn(sold, now);
  const everBought = byUser.size;
  return {
    activeNow: liveNow,
    totalMembers: users.length,
    noMembershipNow: Math.max(0, users.length - liveNow),
    everBought,
    signups: cur.signups,
    newMemberships: cur.news,
    renewals: cur.renewals,
    complimentary: cur.complimentary,
    previous: { signups: prev.signups, newMemberships: prev.news, renewals: prev.renewals },
    change: { signups: pct(cur.signups, prev.signups), newMemberships: pct(cur.news, prev.news), renewals: pct(cur.renewals, prev.renewals) },
    series,
  };
};

// ── Dues ─────────────────────────────────────────────────────────────────────
export const duesReport = ({ payments, installments, users, subs }, range, now = new Date()) => {
  const cancelled = new Set(subs.filter((s) => s.status === "cancelled").map((s) => String(s._id)));
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const owed = payments.filter((p) => userMap.has(String(p.userId)) && !cancelled.has(String(p.subscriptionId)) && p.amountDue > p.amountPaid);
  const outstanding = owed.reduce((s, p) => s + (p.amountDue - p.amountPaid), 0);

  const live = installments.filter((i) => userMap.has(String(i.userId)) && i.status !== "waived" && i.status !== "paid" && !cancelled.has(String(i.subscriptionId)));
  const left = (i) => Math.max(0, i.amountDue - (i.amountPaid || 0));
  const overdue = live.filter((i) => new Date(i.dueDate) < now && left(i) > 0);
  const overdueDays = (i) => Math.max(1, Math.floor((now - new Date(i.dueDate)) / DAY));
  const aging = [
    { key: "1-7", label: "1–7 days", amount: 0, count: 0 },
    { key: "8-30", label: "8–30 days", amount: 0, count: 0 },
    { key: "31+", label: "31+ days", amount: 0, count: 0 },
  ];
  overdue.forEach((i) => {
    const d = overdueDays(i);
    const b = d <= 7 ? aging[0] : d <= 30 ? aging[1] : aging[2];
    b.amount += left(i); b.count += 1;
  });
  const upcoming = (days) => {
    const limit = new Date(now.getTime() + days * DAY);
    const rows = live.filter((i) => new Date(i.dueDate) >= now && new Date(i.dueDate) < limit && left(i) > 0);
    return { count: rows.length, amount: rows.reduce((s, i) => s + left(i), 0) };
  };

  // Collection rate: of the installments that fell due in the period, how much was paid
  const dueInRange = installments.filter((i) => userMap.has(String(i.userId)) && i.status !== "waived" && !cancelled.has(String(i.subscriptionId)) && inRange(i.dueDate, range.start, range.end));
  const dueAmount = dueInRange.reduce((s, i) => s + i.amountDue, 0);
  const collectedAmount = dueInRange.reduce((s, i) => s + Math.min(i.amountDue, i.amountPaid || 0), 0);

  // People with the most owed
  const per = new Map();
  owed.forEach((p) => {
    const k = String(p.userId);
    const e = per.get(k) || { userId: k, owed: 0, overdueCount: 0, oldestOverdueDays: 0 };
    e.owed += p.amountDue - p.amountPaid;
    per.set(k, e);
  });
  overdue.forEach((i) => {
    const k = String(i.userId);
    const e = per.get(k) || { userId: k, owed: 0, overdueCount: 0, oldestOverdueDays: 0 };
    e.overdueCount += 1;
    e.oldestOverdueDays = Math.max(e.oldestOverdueDays, overdueDays(i));
    per.set(k, e);
  });
  const top = [...per.values()]
    .sort((a, b) => b.owed - a.owed || b.oldestOverdueDays - a.oldestOverdueDays)
    .slice(0, 10)
    .map((e) => {
      const u = userMap.get(e.userId) || {};
      return { id: e.userId, name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Member", code: u.userId || "", phone: u.phoneNumber || "", owed: e.owed, overdueCount: e.overdueCount, oldestOverdueDays: e.oldestOverdueDays };
    });

  return {
    outstanding,
    membersWithDues: new Set(owed.map((p) => String(p.userId))).size,
    overdue: { count: overdue.length, amount: overdue.reduce((s, i) => s + left(i), 0), members: new Set(overdue.map((i) => String(i.userId))).size },
    aging,
    upcoming: { next7: upcoming(7), next30: upcoming(30) },
    collection: { dueAmount, collectedAmount, installments: dueInRange.length, rate: dueAmount > 0 ? Math.round((collectedAmount / dueAmount) * 100) : null },
    top,
  };
};

// ── Renewals ─────────────────────────────────────────────────────────────────
export const renewalsReport = ({ users, subs }, range, now = new Date()) => {
  const known = new Set(users.map((u) => String(u._id)));
  const sold = soldSubs(subs).filter((s) => known.has(String(s.userId)));
  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const byUser = new Map();
  sold.forEach((s) => { const k = String(s.userId); (byUser.get(k) || byUser.set(k, []).get(k)).push(s); });
  const renewedBy = (s) => (byUser.get(String(s.userId)) || []).some((o) => o !== s && o.status !== "cancelled" && soldAt(o) > soldAt(s));
  const eligible = (s) => s.status !== "cancelled" && s.status !== "complimentary";

  const expiring = (days) => {
    const limit = new Date(now.getTime() + days * DAY);
    return sold.filter((s) => (s.status === "active" || s.status === "grace") && new Date(s.endDate) >= now && new Date(s.endDate) < limit && !renewedBy(s));
  };
  const person = (s) => {
    const u = userMap.get(String(s.userId)) || {};
    return { id: String(s.userId), name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Member", code: u.userId || "", phone: u.phoneNumber || "", plan: s.planSnapshot?.planName || s.planName || "", endDate: s.endDate };
  };
  const next30 = expiring(30);

  const ending = sold.filter((s) => eligible(s) && inRange(s.endDate, range.start, range.end));
  const renewed = ending.filter(renewedBy);
  const notRenewed = ending.filter((s) => !renewedBy(s));
  const lapsed = notRenewed.filter((s) => new Date(s.gracePeriodEnds) < now);
  const undecided = notRenewed.length - lapsed.length;
  const decided = renewed.length + lapsed.length;

  return {
    expiring: { next7: expiring(7).length, next15: expiring(15).length, next30: next30.length },
    expiringList: next30.sort((a, b) => new Date(a.endDate) - new Date(b.endDate)).slice(0, 10).map(person),
    period: {
      ending: ending.length,
      renewed: renewed.length,
      lapsed: lapsed.length,
      undecided,
      rate: decided > 0 ? Math.round((renewed.length / decided) * 100) : null,
    },
    lapsedList: lapsed.sort((a, b) => new Date(b.endDate) - new Date(a.endDate)).slice(0, 10).map(person),
  };
};
