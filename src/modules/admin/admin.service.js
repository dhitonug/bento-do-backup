import * as adminRepo from "./admin.repository.js";
import * as templatesRepo from "../templates/templates.repository.js";

const createAppError = (message, status = 400, extra = {}) => {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
};

export const getDashboard = async () => {
  const [stats, activity, recentTemplates] = await Promise.all([
    adminRepo.getAdminStats(),
    adminRepo.getUserActivityLastSevenDays(),
    adminRepo.listRecentTemplates(),
  ]);

  return {
    stats,
    activity,
    recent_templates: recentTemplates,
  };
};

export const getTemplates = async () => {
  const templates = await adminRepo.listTemplates();

  return {
    total_items: templates.length,
    data: templates,
  };
};

export const createTemplate = async (adminUserId, data) => {
  const template = await templatesRepo.createTemplate(
    adminUserId,
    {
      ...data,
      visibility: "public",
    },
    { isOfficial: true },
  );

  return {
    data: template,
  };
};

export const deleteTemplate = async (templateId) => {
  const deleted = await adminRepo.deleteTemplate(templateId);

  if (!deleted) {
    throw createAppError("Template tidak ditemukan!", 404);
  }

  return deleted;
};
