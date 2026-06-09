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
        role,
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
  { email, password_hash, display_name, role = "user" },
  executor = db,
) => {
  const { rows } = await executor.query(
    `
      INSERT INTO users (
        email,
        password_hash,
        display_name,
        role
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        email,
        display_name,
        role,
        current_energy,
        max_energy,
        created_at,
        updated_at
    `,
    [email, password_hash, display_name, role],
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
        role,
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

// UPDATE USER PASSWORD
export const updateUserPassword = async (
  userId,
  password_hash,
  executor = db,
) => {
  const { rows } = await executor.query(
    `
      UPDATE users
      SET
        password_hash = $2,
        updated_at = NOW()
      WHERE id = $1
      AND deleted_at IS NULL
      RETURNING
        id,
        email,
        display_name,
        role,
        current_energy,
        max_energy,
        created_at,
        updated_at
    `,
    [userId, password_hash],
  );

  return rows[0] || null;
};

// PASSWORD RESET TOKENS
export const createPasswordResetToken = async (
  { user_id, token_hash, expires_minutes },
  executor = db,
) => {
  const { rows } = await executor.query(
    `
      INSERT INTO password_reset_tokens (
        user_id,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, NOW() + ($3::int * INTERVAL '1 minute'))
      RETURNING
        id,
        user_id,
        token_hash,
        expires_at,
        used_at,
        created_at
    `,
    [user_id, token_hash, expires_minutes],
  );

  return rows[0];
};

export const findValidPasswordResetToken = async (
  token_hash,
  executor = db,
) => {
  const { rows } = await executor.query(
    `
      SELECT
        prt.id,
        prt.user_id,
        prt.token_hash,
        prt.expires_at,
        prt.used_at,
        prt.created_at,
        u.email,
        u.display_name
      FROM password_reset_tokens prt
      JOIN users u ON u.id = prt.user_id
      WHERE prt.token_hash = $1
      AND prt.used_at IS NULL
      AND prt.expires_at > NOW()
      AND u.deleted_at IS NULL
      LIMIT 1
      FOR UPDATE
    `,
    [token_hash],
  );

  return rows[0] || null;
};

export const markPasswordResetTokenAsUsed = async (
  tokenId,
  executor = db,
) => {
  const { rows } = await executor.query(
    `
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE id = $1
      AND used_at IS NULL
      RETURNING id
    `,
    [tokenId],
  );

  return rows[0] || null;
};

export const revokeUnusedPasswordResetTokensForUser = async (
  userId,
  executor = db,
) => {
  const { rows } = await executor.query(
    `
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE user_id = $1
      AND used_at IS NULL
      RETURNING id
    `,
    [userId],
  );

  return rows;
};
