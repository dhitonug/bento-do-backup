import { db } from "../../config/db.js";

// FIND USER BY EMAIL
// Dipakai saat:
// - register (cek email)
// - login
export const findUserByEmail = async (email, executor = db) => {
  const { rows } = await executor.query(
    `
      SELECT
        id,
        email,
        password_hash,
        display_name,
        current_energy,
        max_energy,
        created_at,
        updated_at
      FROM users
      WHERE email = $1
      AND deleted_at IS NULL
    `,
    [email],
  );

  return rows[0] || null;
};

// CREATE USER
export const createUser = async (
  { email, password_hash, display_name },
  executor = db,
) => {
  const { rows } = await executor.query(
    `
      INSERT INTO users (
        email,
        password_hash,
        display_name
      )
      VALUES ($1, $2, $3)
      RETURNING
        id,
        email,
        display_name,
        current_energy,
        max_energy,
        created_at,
        updated_at
    `,
    [email, password_hash, display_name],
  );

  return rows[0];
};

// FIND USER BY ID
// Dipakai middleware/profile
export const findUserById = async (id, executor = db) => {
  const { rows } = await executor.query(
    `
      SELECT
        id,
        email,
        display_name,
        current_energy,
        max_energy,
        created_at,
        updated_at
      FROM users
      WHERE id = $1
      AND deleted_at IS NULL
    `,
    [id],
  );

  return rows[0] || null;
};