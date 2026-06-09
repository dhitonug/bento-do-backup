import crypto from "crypto";

import { db } from "../../config/db.js";
import * as taskRepo from "../tasks/tasks.repository.js";

const slugify = (value) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "template";
};

const levelFromEnergy = (energyWeight) => {
  if (energyWeight === "Berat") return "High";
  if (energyWeight === "Sedang") return "Medium";
  return "Low";
};

const formatTemplateRows = (templateRows, itemRows) => {
  const itemsByTemplate = itemRows.reduce((acc, item) => {
    if (!acc[item.template_id]) {
      acc[item.template_id] = [];
    }

    acc[item.template_id].push({
      id: item.id,
      title: item.title,
      description: item.description,
      energy_weight: item.energy_weight,
      level: levelFromEnergy(item.energy_weight),
      sort_order: item.sort_order,
    });

    return acc;
  }, {});

  return templateRows.map((template) => {
    const items = itemsByTemplate[template.id] || [];

    return {
      id: template.id,
      key: template.key,
      name: template.name,
      description: template.description,
      level: template.level,
      visibility: template.visibility,
      is_official: template.is_official,
      usage_count: template.usage_count,
      created_by_user_id: template.created_by_user_id,
      created_by: template.created_by_user_id
        ? {
            id: template.created_by_user_id,
            display_name: template.created_by_display_name,
            email: template.created_by_email,
          }
        : null,
      created_at: template.created_at,
      updated_at: template.updated_at,
      total_items: items.length,
      preview_items: items,
      items,
    };
  });
};

const getTemplateItems = async (templateIds, executor = db) => {
  if (!templateIds.length) {
    return [];
  }

  const { rows } = await executor.query(
    `
      SELECT
        id,
        template_id,
        title,
        description,
        energy_weight,
        sort_order
      FROM template_items
      WHERE template_id = ANY($1::uuid[])
      AND deleted_at IS NULL
      ORDER BY sort_order ASC, created_at ASC
    `,
    [templateIds],
  );

  return rows;
};

export const listTemplates = async (identifier, executor = db) => {
  const userId = identifier?.user_id ?? null;

  const { rows } = await executor.query(
    `
      SELECT
        tt.id,
        tt.key,
        tt.name,
        tt.description,
        tt.created_by_user_id,
        tt.visibility,
        tt.level,
        tt.is_official,
        tt.usage_count,
        tt.created_at,
        tt.updated_at,
        u.display_name AS created_by_display_name,
        u.email AS created_by_email
      FROM task_templates tt
      LEFT JOIN users u
        ON u.id = tt.created_by_user_id
      WHERE tt.deleted_at IS NULL
      AND (
        tt.is_official = TRUE
        OR tt.visibility = 'public'
        OR tt.created_by_user_id = $1
      )
      ORDER BY
        tt.is_official DESC,
        tt.created_at DESC
    `,
    [userId],
  );

  const items = await getTemplateItems(
    rows.map((template) => template.id),
    executor,
  );

  return formatTemplateRows(rows, items);
};

export const listAdminTemplates = async (limit = null, executor = db) => {
  const params = [];
  const limitClause = limit ? "LIMIT $1" : "";

  if (limit) {
    params.push(limit);
  }

  const { rows } = await executor.query(
    `
      SELECT
        tt.id,
        tt.key,
        tt.name,
        tt.description,
        tt.created_by_user_id,
        tt.visibility,
        tt.level,
        tt.is_official,
        tt.usage_count,
        tt.created_at,
        tt.updated_at,
        u.display_name AS created_by_display_name,
        u.email AS created_by_email
      FROM task_templates tt
      LEFT JOIN users u
        ON u.id = tt.created_by_user_id
      WHERE tt.deleted_at IS NULL
      ORDER BY tt.created_at DESC
      ${limitClause}
    `,
    params,
  );

  const items = await getTemplateItems(
    rows.map((template) => template.id),
    executor,
  );

  return formatTemplateRows(rows, items);
};

export const findTemplateByKey = async (
  templateKey,
  identifier = {},
  executor = db,
) => {
  const userId = identifier?.user_id ?? null;

  const { rows } = await executor.query(
    `
      SELECT
        tt.id,
        tt.key,
        tt.name,
        tt.description,
        tt.created_by_user_id,
        tt.visibility,
        tt.level,
        tt.is_official,
        tt.usage_count,
        tt.created_at,
        tt.updated_at,
        u.display_name AS created_by_display_name,
        u.email AS created_by_email
      FROM task_templates tt
      LEFT JOIN users u
        ON u.id = tt.created_by_user_id
      WHERE tt.key = $1
      AND tt.deleted_at IS NULL
      AND (
        tt.is_official = TRUE
        OR tt.visibility = 'public'
        OR tt.created_by_user_id = $2
      )
      LIMIT 1
    `,
    [templateKey, userId],
  );

  if (!rows[0]) {
    return null;
  }

  const items = await getTemplateItems([rows[0].id], executor);

  return formatTemplateRows(rows, items)[0];
};

const generateUniqueTemplateKey = async (name, executor = db) => {
  const baseKey = slugify(name);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix =
      attempt === 0 ? "" : `-${crypto.randomBytes(3).toString("hex")}`;
    const key = `${baseKey}${suffix}`;

    const { rows } = await executor.query(
      `
        SELECT id
        FROM task_templates
        WHERE key = $1
        LIMIT 1
      `,
      [key],
    );

    if (!rows[0]) {
      return key;
    }
  }

  return `${baseKey}-${crypto.randomUUID().slice(0, 8)}`;
};

export const createTemplate = async (userId, data, options = {}) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const key = await generateUniqueTemplateKey(data.name, client);
    const isOfficial = options.isOfficial === true;
    const visibility = isOfficial ? "public" : data.visibility;

    const { rows } = await client.query(
      `
        INSERT INTO task_templates (
          key,
          name,
          description,
          created_by_user_id,
          visibility,
          level,
          is_official,
          usage_count
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
        RETURNING
          id,
          key,
          name,
          description,
          created_by_user_id,
          visibility,
          level,
          is_official,
          usage_count,
          created_at,
          updated_at
      `,
      [
        key,
        data.name,
        data.description ?? null,
        userId,
        visibility,
        data.level,
        isOfficial,
      ],
    );

    const template = rows[0];

    for (const [index, item] of data.items.entries()) {
      await client.query(
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
          template.id,
          item.title,
          item.description ?? null,
          item.energy_weight,
          index + 1,
        ],
      );
    }

    await client.query("COMMIT");

    return await findTemplateByKey(key, { user_id: userId });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const updateOwnedTemplate = async (userId, templateId, data) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
        UPDATE task_templates
        SET
          name = $3,
          description = $4,
          visibility = $5,
          level = $6,
          updated_at = NOW()
        WHERE id = $1
        AND created_by_user_id = $2
        AND is_official = FALSE
        AND deleted_at IS NULL
        RETURNING key
      `,
      [
        templateId,
        userId,
        data.name,
        data.description ?? null,
        data.visibility,
        data.level,
      ],
    );

    if (!rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `
        UPDATE template_items
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE template_id = $1
        AND deleted_at IS NULL
      `,
      [templateId],
    );

    for (const [index, item] of data.items.entries()) {
      await client.query(
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
          item.description ?? null,
          item.energy_weight,
          index + 1,
        ],
      );
    }

    await client.query("COMMIT");

    return await findTemplateByKey(rows[0].key, { user_id: userId });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const deleteOwnedTemplate = async (userId, templateId, executor = db) => {
  const { rows } = await executor.query(
    `
      UPDATE task_templates
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1
      AND created_by_user_id = $2
      AND is_official = FALSE
      AND deleted_at IS NULL
      RETURNING id
    `,
    [templateId, userId],
  );

  return rows[0] || null;
};

export const cloneTemplateAsPrivate = async (userId, template) => {
  return createTemplate(userId, {
    name: template.name,
    description: template.description ?? "",
    visibility: "private",
    level: template.level ?? "Medium",
    items: template.items.map((item) => ({
      title: item.title,
      description: item.description ?? "",
      energy_weight: item.energy_weight,
    })),
  });
};

export const applyTemplate = async (identifier, template, sourceTemplate = null) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const createdTasks = [];

    for (const item of template.items) {
      const createdTask = await taskRepo.createTask(
        {
          user_id: identifier.user_id ?? null,
          guest_session_id: identifier.guest_session_id ?? null,
          title: item.title,
          energy_weight: item.energy_weight,
          deadline: null,
          source_template: sourceTemplate ?? template.name,
        },
        client,
      );

      createdTasks.push(createdTask);
    }

    await client.query(
      `
        UPDATE task_templates
        SET usage_count = usage_count + 1
        WHERE id = $1
      `,
      [template.id],
    );

    await client.query("COMMIT");

    return createdTasks;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const softDeleteTemplate = async (templateId, executor = db) => {
  const { rows } = await executor.query(
    `
      UPDATE task_templates
      SET deleted_at = NOW()
      WHERE id = $1
      AND deleted_at IS NULL
      RETURNING id
    `,
    [templateId],
  );

  return rows[0] || null;
};
