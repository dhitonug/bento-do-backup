import { db } from "../config/db.js";

const email = process.argv[2]?.trim();

if (!email) {
  console.error("Usage: npm run make-admin -- user@example.com");
  await db.end();
  process.exit(1);
}

try {
  const result = await db.query(
    `
      UPDATE users
      SET role = 'admin',
          updated_at = NOW()
      WHERE LOWER(email) = LOWER($1)
        AND deleted_at IS NULL
      RETURNING id, email, display_name, role
    `,
    [email]
  );

  if (result.rowCount === 0) {
    console.error(`User not found or already deleted: ${email}`);
    process.exitCode = 1;
  } else {
    const user = result.rows[0];
    console.log(
      `Admin ready: ${user.email} (${user.display_name || "no display name"})`
    );
  }
} catch (error) {
  console.error("Failed to promote admin:", error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
