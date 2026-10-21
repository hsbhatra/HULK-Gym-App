// =============================================================================
// src/config/migrations.js
// =============================================================================
// Small, idempotent fixes applied on every server start (safe to re-run).
// =============================================================================

import mongoose from "mongoose";
import Counter from "../models/counter.model.js";
import { RECEIPT_PREFIX } from "../utils/constants.js";

// Payment.receiptNumber used to be assigned when checkout OPENED, so it was
// unique + required in practice. Now it is only set once money arrives, so
// pending payments have none → the unique index must be sparse, otherwise
// the second pending payment collides on "null".
const makeReceiptIndexSparse = async () => {
  const coll = mongoose.connection.collection("payments");
  const indexes = await coll.indexes().catch(() => []);
  const idx = indexes.find((i) => i.key && i.key.receiptNumber === 1);
  if (idx?.sparse) return;
  if (idx) await coll.dropIndex(idx.name);
  await coll.createIndex({ receiptNumber: 1 }, { unique: true, sparse: true, name: "receiptNumber_1" });
  console.log("[migration] payments.receiptNumber index is now unique + sparse");
};

// Start this year's receipt counter after the highest number already used,
// so new receipts never clash with numbers issued by the old generator.
const seedReceiptCounter = async () => {
  const year = new Date().getFullYear();
  const prefix = `${RECEIPT_PREFIX}-${year}-`;
  const rx = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`);

  let max = 0;
  for (const name of ["payments", "receipts"]) {
    const docs = await mongoose.connection
      .collection(name)
      .find({ receiptNumber: { $regex: rx } }, { projection: { receiptNumber: 1 } })
      .toArray()
      .catch(() => []);
    for (const d of docs) max = Math.max(max, Number(d.receiptNumber.match(rx)[1]));
  }

  await Counter.updateOne(
    { _id: `receipt_${year}` },
    { $max: { seq: max } },
    { upsert: true },
  );
};

export const runMigrations = async () => {
  for (const [name, fn] of [
    ["makeReceiptIndexSparse", makeReceiptIndexSparse],
    ["seedReceiptCounter", seedReceiptCounter],
  ]) {
    try {
      await fn();
    } catch (err) {
      console.error(`[migration] ${name} failed:`, err.message);
    }
  }
};
