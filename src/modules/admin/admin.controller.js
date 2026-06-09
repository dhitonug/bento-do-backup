import * as adminService from "./admin.service.js";

const handleAdminError = (res, error, fallbackLabel) => {
  console.error(fallbackLabel, error);

  return res.status(error.status || 500).json({
    success: false,
    message: error.message || "Terjadi kesalahan pada server.",
  });
};

export const getDashboard = async (req, res) => {
  try {
    const data = await adminService.getDashboard();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return handleAdminError(res, error, "GET ADMIN DASHBOARD ERROR:");
  }
};

export const getTemplates = async (req, res) => {
  try {
    const result = await adminService.getTemplates();

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleAdminError(res, error, "GET ADMIN TEMPLATES ERROR:");
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    await adminService.deleteTemplate(req.params.template_id);

    return res.status(200).json({
      success: true,
      message: "Template berhasil dihapus.",
    });
  } catch (error) {
    return handleAdminError(res, error, "DELETE ADMIN TEMPLATE ERROR:");
  }
};
