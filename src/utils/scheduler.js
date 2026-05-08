import cron from "node-cron";
import { db } from "../config/db.js";

cron.schedule("0 * * * *", async () => {
  console.log("[Scheduler] Running deadline reminder checks...");
  try {
    const query = `
      INSERT INTO notifications (user_id, task_id, message, type, scheduled_at)
      SELECT 
        t.user_id, 
        t.id, 
        CASE 
          WHEN t.deadline <= NOW() + INTERVAL '24 hours' THEN 'Deadline tugas "' || t.title || '" besok!'
          ELSE 'Tugas "' || t.title || '" tinggal 3 hari lagi.'
        END as message,
        'deadline_reminder' as type,
        NOW() as scheduled_at
      FROM tasks t
      WHERE t.status IN ('pending', 'in_progress') 
        AND t.deleted_at IS NULL
        AND t.deadline IS NOT NULL
        AND t.deadline <= NOW() + INTERVAL '3 days'
        AND t.deadline > NOW()
        AND t.user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM notifications n 
          WHERE n.task_id = t.id 
            AND n.type = 'deadline_reminder' 
            AND n.created_at >= NOW() - INTERVAL '24 hours'
        )
      RETURNING id;
    `;
    const result = await db.query(query);
    if (result.rowCount > 0) {
      console.log(`[Scheduler] Generated ${result.rowCount} deadline reminders.`);
    }
  } catch (error) {
    console.error("[Scheduler] Error running deadline reminder job:", error.message);
  }
});

console.log("[Scheduler] Cron jobs initialized.");
