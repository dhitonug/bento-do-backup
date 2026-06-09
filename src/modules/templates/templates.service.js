import * as templatesRepo from "./templates.repository.js";

const createAppError = (message, status = 400, extra = {}) => {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
};

const assertIdentifier = (identifier) => {
  if (!identifier?.user_id && !identifier?.guest_session_id) {
    throw createAppError("Identitas pengguna tidak valid!", 401);
  }
};

const assertUserOnly = (identifier) => {
  if (!identifier?.user_id) {
    throw createAppError(
      "Fitur ini hanya untuk pengguna terdaftar. Silakan login terlebih dahulu.",
      403,
      {
        require_login: true,
        code: "LOGIN_REQUIRED_FOR_TEMPLATES",
      },
    );
  }
};

export const getTemplates = async (identifier) => {
  assertIdentifier(identifier);
  assertUserOnly(identifier);

  const templates = await templatesRepo.listTemplates(identifier);

  return {
    total_items: templates.length,
    data: templates,
  };
};

export const applyTemplate = async (identifier, templateKey) => {
  assertIdentifier(identifier);
  assertUserOnly(identifier);

  const template = await templatesRepo.findTemplateByKey(templateKey, identifier);

  if (!template) {
    throw createAppError("Template tidak ditemukan!", 404);
  }

  const createdTasks = await templatesRepo.applyTemplate(
    identifier,
    template,
    template.name,
  );

  return {
    template: {
      key: template.key,
      name: template.name,
      total_items: template.items.length,
    },
    inserted_count: createdTasks.length,
    data: createdTasks,
  };
};

export const createTemplate = async (identifier, data) => {
  assertIdentifier(identifier);
  assertUserOnly(identifier);

  const template = await templatesRepo.createTemplate(identifier.user_id, data);

  return {
    data: template,
  };
};
