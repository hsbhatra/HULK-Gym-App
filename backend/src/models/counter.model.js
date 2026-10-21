// =============================================================================
// src/models/counter.model.js
// =============================================================================
// Atomic sequence counter — used for userId generation.
// findOneAndUpdate with $inc is atomic in MongoDB, preventing race conditions.
// =============================================================================

import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "userId"
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);
export default Counter;