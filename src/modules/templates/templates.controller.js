import * as templatesService from "./templates.service.js";

const getIdentifier = (req) => {
  return {
    user_id: req.identity?.user_id ?? null,
    guest_session_id: req.identity?.guest_session_id ?? null,
  };
};

const handleTemplatesError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error);

  const statusCode = error.status || 500;

  const response = {
    success: false,
    message: error.message || "Terjadi kesalahan pada server.",
  };

  if (error.require_login) {
    response.require_login = true;
  }

  if (error.code) {
    response.code = error.code;
  }

  return res.status(statusCode).json(response);
};

export const getTemplates = async (req, res) => {
  try {
    const identifier = getIdentifier(req);

    const result = await templatesService.getTemplates(identifier);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleTemplatesError(res, error, "GET TEMPLATES ERROR:");
  }
};

export const createTemplate = async (req, res) => {
  try {
    const identifier = getIdentifier(req);

    const result = await templatesService.createTemplate(identifier, req.body);

    return res.status(201).json({
      success: true,
      message: "Template berhasil dibuat.",
      ...result,
    });
  } catch (error) {
    return handleTemplatesError(res, error, "CREATE TEMPLATE ERROR:");
  }
};

export const applyTemplate = async (req, res) => {
  try {
    const identifier = getIdentifier(req);
    const { template_key } = req.params;

    const result = await templatesService.applyTemplate(
      identifier,
      template_key,
    );

    return res.status(201).json({
      success: true,
      message: `Template ${result.template.name} berhasil diterapkan.`,
      ...result,
    });
  } catch (error) {
    return handleTemplatesError(res, error, "APPLY TEMPLATE ERROR:");
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const identifier = getIdentifier(req);
    const { template_id } = req.params;

    const result = await templatesService.updateTemplate(
      identifier,
      template_id,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Template berhasil diperbarui.",
      ...result,
    });
  } catch (error) {
    return handleTemplatesError(res, error, "UPDATE TEMPLATE ERROR:");
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const identifier = getIdentifier(req);
    const { template_id } = req.params;

    await templatesService.deleteTemplate(identifier, template_id);

    return res.status(200).json({
      success: true,
      message: "Template berhasil dihapus.",
    });
  } catch (error) {
    return handleTemplatesError(res, error, "DELETE TEMPLATE ERROR:");
  }
};

export const saveTemplateAsPrivate = async (req, res) => {
  try {
    const identifier = getIdentifier(req);
    const { template_key } = req.params;

    const result = await templatesService.saveTemplateAsPrivate(
      identifier,
      template_key,
    );

    return res.status(201).json({
      success: true,
      message: "Template berhasil disimpan sebagai private.",
      ...result,
    });
  } catch (error) {
    return handleTemplatesError(res, error, "SAVE TEMPLATE AS PRIVATE ERROR:");
  }
};
