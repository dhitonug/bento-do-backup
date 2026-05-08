import cron from "node-cron";
import { db } from "../config/db.js";

// Run every hour to check for upcoming deadlines
cron.schedule("0 * * * *", async () => {
  console.log("[Scheduler] Running deadline reminder checks...");
  try {
    // We look for tasks that are pending or in_progress and have a deadline in the next 3 days
    // We only generate notifications if one hasn't been created recently for the same task
    // To keep it simple with existing DB, we use 'deadline_reminder' type.
    
    const query = `
      INSERT INTO notifications (user_id, task_id, message, type, scheduled_at)
      SELECT 
        t.user_id, 
        t.id, 
        CASE 
          WHEN t.deadline <= NOW() + INTERVAL '24 hours' THEN 'Deadline tugas ' || t.title || ' besok!'
          ELSE 'Tugas ' || t.title || ' tinggal 3 hari lagi.'
        END as message,
        'deadline_reminder' as type,
        NOW() as scheduled_at
      FROM tasks t
      WHERE t.status IN ('pending', 'in_progress') 
        AND t.deleted_at IS NULL
        AND t.deadline IS NOT NULL
        AND t.deadline <= NOW() + INTERVAL '3 days'
        AND t.deadline > NOW()
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
