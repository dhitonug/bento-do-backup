import { db } from "../../config/db.js";

// CREATE GUEST SESSION

export const createGuestSession = async (session_token) => {
  const { rows } = await db.query(
    `
      INSERT INTO guest_sessions (
        session_token
      )

      VALUES ($1)

      RETURNING
        id,
        session_token,
        synced_at,
        created_at,
        updated_at
      `,
    [session_token],
  );

  return rows[0];
};

// FIND GUEST BY ID

export const findGuestById = async (id) => {
  const { rows } = await db.query(
    `
      SELECT
        id,
        session_token,
        synced_at,
        created_at,
        updated_at
      FROM guest_sessions

      WHERE id = $1
      AND deleted_at IS NULL
      `,
    [id],
  );

  return rows[0] || null;
};

// FIND GUEST BY TOKEN

export const findGuestByToken = async (session_token) => {
  const { rows } = await db.query(
    `
      SELECT
        id,
        session_token,
        synced_at,
        created_at,
        updated_at
      FROM guest_sessions

      WHERE session_token = $1
      AND deleted_at IS NULL
      `,
    [session_token],
  );

  return rows[0] || null;
};
