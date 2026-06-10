import { db } from "./db.js";

const OFFICIAL_TEMPLATES = [
  {
    key: "makalah",
    name: "Makalah",
    description: "Template cepat untuk tugas makalah mahasiswa.",
    level: "Medium",
    items: [
      {
        title: "Tentukan topik makalah",
        description: "Tentukan topik utama dan batasan pembahasan makalah.",
        energy_weight: "Ringan",
      },
      {
        title: "Cari referensi & susun outline makalah",
        description: "Kumpulkan sumber tepercaya lalu susun kerangka tulisan.",
        energy_weight: "Sedang",
      },
      {
        title: "Tulis dan revisi makalah",
        description: "Tulis isi makalah, rapikan sitasi, lalu revisi sebelum dikumpulkan.",
        energy_weight: "Berat",
      },
    ],
  },
  {
    key: "presentasi",
    name: "Presentasi",
    description: "Template cepat untuk persiapan presentasi kelas.",
    level: "Medium",
    items: [
      {
        title: "Tentukan poin utama presentasi",
        description: "Pilih pesan utama dan urutan pembahasan.",
        energy_weight: "Ringan",
      },
      {
        title: "Buat slide presentasi",
        description: "Buat slide ringkas dengan struktur pembuka, isi, dan penutup.",
        energy_weight: "Sedang",
      },
      {
        title: "Latihan presentasi",
        description: "Latih penyampaian dan cek durasi presentasi.",
        energy_weight: "Sedang",
      },
    ],
  },
  {
    key: "praktikum",
    name: "Praktikum",
    description: "Template cepat untuk tugas atau laporan praktikum.",
    level: "High",
    items: [
      {
        title: "Pahami modul praktikum",
        description: "Baca instruksi, alat, bahan, dan tujuan praktikum.",
        energy_weight: "Ringan",
      },
      {
        title: "Kerjakan praktikum / eksperimen",
        description: "Lakukan percobaan dan catat hasil penting.",
        energy_weight: "Berat",
      },
      {
        title: "Susun laporan praktikum",
        description: "Rapikan data, analisis hasil, dan tulis kesimpulan.",
        energy_weight: "Sedang",
      },
    ],
  },
  {
    key: "ujian",
    name: "Ujian",
    description: "Template cepat untuk persiapan ujian.",
    level: "High",
    items: [
      {
        title: "Kumpulkan materi ujian",
        description: "Gabungkan catatan, slide, dan referensi penting.",
        energy_weight: "Ringan",
      },
      {
        title: "Buat ringkasan & latihan soal",
        description: "Buat rangkuman inti dan kerjakan contoh soal.",
        energy_weight: "Sedang",
      },
      {
        title: "Review materi inti ujian",
        description: "Ulang materi tersulit dan tandai bagian yang masih lemah.",
        energy_weight: "Berat",
      },
    ],
  },
];

const addCheckConstraintIfMissing = async (constraintName, sql) => {
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${constraintName}'
      ) THEN
        ${sql}
      END IF;
    END
    $$;
  `);
};

const seedOfficialTemplates = async () => {
  for (const template of OFFICIAL_TEMPLATES) {
    const { rows } = await db.query(
      `
        INSERT INTO task_templates (
          key,
          name,
          description,
          visibility,
          level,
          is_official,
          usage_count
        )
        VALUES ($1, $2, $3, 'public', $4, TRUE, 0)
        ON CONFLICT (key)
        DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          visibility = 'public',
          level = EXCLUDED.level,
          is_official = TRUE,
          updated_at = NOW()
        RETURNING id
      `,
      [template.key, template.name, template.description, template.level],
    );

    const templateId = rows[0].id;

    const existingItems = await db.query(
      `
        SELECT COUNT(*)::int AS total
        FROM template_items
        WHERE template_id = $1
        AND deleted_at IS NULL
      `,
      [templateId],
    );

    if (existingItems.rows[0].total > 0) {
      continue;
    }

    for (const [index, item] of template.items.entries()) {
      await db.query(
        `
          INSERT INTO template_items (
            template_id,
            title,
            description,
            energy_weight,
            sort_order
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          templateId,
          item.title,
          item.description,
          item.energy_weight,
          index + 1,
        ],
      );
    }
  }
};

export const ensureOperationalTables = async () => {
  await db.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  await db.query(`
    DO $$
    BEGIN
      IF to_regclass('public.tasks') IS NOT NULL THEN
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS description TEXT NULL;
      END IF;

      IF to_regclass('public.focus_sessions') IS NOT NULL THEN
        ALTER TABLE focus_sessions
        ALTER COLUMN user_id DROP NOT NULL;

        ALTER TABLE focus_sessions
        ADD COLUMN IF NOT EXISTS guest_session_id UUID NULL REFERENCES guest_sessions(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  await db.query(`
    DO $$
    BEGIN
      IF to_regclass('public.focus_sessions') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_active ON focus_sessions(user_id, ended_at) WHERE deleted_at IS NULL';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_focus_sessions_guest_active ON focus_sessions(guest_session_id, ended_at) WHERE deleted_at IS NULL';
      END IF;
    END $$;
  `);

  await addCheckConstraintIfMissing(
    "focus_sessions_owner_check",
    `ALTER TABLE focus_sessions
      ADD CONSTRAINT focus_sessions_owner_check
      CHECK (
        (user_id IS NOT NULL AND guest_session_id IS NULL)
        OR (user_id IS NULL AND guest_session_id IS NOT NULL)
      ) NOT VALID;`,
  );

  await db.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
  `);

  await addCheckConstraintIfMissing(
    "users_role_check",
    "ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));",
  );

  await db.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash
    ON password_reset_tokens(token_hash)
    WHERE used_at IS NULL
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
    ON password_reset_tokens(user_id)
  `);

  await db.query(`
    ALTER TABLE task_templates
    ADD COLUMN IF NOT EXISTS key VARCHAR(120)
  `);

  await db.query(`
    ALTER TABLE task_templates
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL
  `);

  await db.query(`
    ALTER TABLE task_templates
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'public'
  `);

  await db.query(`
    ALTER TABLE task_templates
    ADD COLUMN IF NOT EXISTS level VARCHAR(20) NOT NULL DEFAULT 'Medium'
  `);

  await db.query(`
    ALTER TABLE task_templates
    ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await db.query(`
    ALTER TABLE task_templates
    ADD COLUMN IF NOT EXISTS usage_count INTEGER NOT NULL DEFAULT 0
  `);

  await db.query(`
    ALTER TABLE task_templates
    DROP CONSTRAINT IF EXISTS task_templates_name_key
  `);

  await db.query(`
    UPDATE task_templates
    SET key = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(id::text, 1, 8)
    WHERE key IS NULL
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_task_templates_key
    ON task_templates(key)
  `);

  await addCheckConstraintIfMissing(
    "task_templates_visibility_check",
    "ALTER TABLE task_templates ADD CONSTRAINT task_templates_visibility_check CHECK (visibility IN ('public', 'private'));",
  );

  await addCheckConstraintIfMissing(
    "task_templates_level_check",
    "ALTER TABLE task_templates ADD CONSTRAINT task_templates_level_check CHECK (level IN ('Low', 'Medium', 'High'));",
  );

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_task_templates_visibility
    ON task_templates(visibility, created_by_user_id)
    WHERE deleted_at IS NULL
  `);

  await db.query(`
    ALTER TABLE template_items
    ADD COLUMN IF NOT EXISTS description TEXT NULL
  `);

  await seedOfficialTemplates();
};
