// server.js
import "./src/config/env.js"; // loads dotenv first
import connectDB from "./src/config/db.js";
import { runMigrations } from "./src/config/migrations.js";
import app from "./src/app.js";
import { startSubscriptionReminderJob } from "./src/jobs/subscriptionReminder.job.js";

connectDB().then(runMigrations);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
startSubscriptionReminderJob();