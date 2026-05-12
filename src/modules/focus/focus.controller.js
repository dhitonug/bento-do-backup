import * as focusService from "./focus.service.js";

const getIdentifier = (req) => {
  return {
    user_id: req.identity?.user_id ?? null,
    guest_session_id: req.identity?.guest_session_id ?? null,
  };
};

const handleFocusError = (res, error, fallbackMessage) => {
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

export const startFocusSession = async (req, res) => {
  try {
    const identifier = getIdentifier(req);
    const { task_id } = req.body;

    const result = await focusService.startFocusSession(identifier, task_id);

    return res.status(201).json({
      success: true,
      message: "Sesi fokus berhasil dimulai.",
      ...result,
    });
  } catch (error) {
    return handleFocusError(res, error, "START FOCUS SESSION ERROR:");
  }
};

export const getActiveFocusSession = async (req, res) => {
  try {
    const identifier = getIdentifier(req);

    const result = await focusService.getActiveFocusSession(identifier);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleFocusError(res, error, "GET ACTIVE FOCUS SESSION ERROR:");
  }
};

export const stopFocusSession = async (req, res) => {
  try {
    const identifier = getIdentifier(req);
    const { id } = req.params;
    const { end_reason } = req.body;

    const result = await focusService.stopFocusSession(
      identifier,
      id,
      end_reason,
    );

    const endReasonMessageMap = {
      completed: "Sesi fokus selesai.",
      escaped: "Sesi fokus dihentikan lebih awal.",
      zombie_limit:
        "Sesi fokus dihentikan otomatis karena mencapai batas maksimal durasi yang diizinkan.",
      crash: "Sesi fokus diakhiri setelah pemulihan crash.",
    };

    const response = {
      success: true,
      message:
        endReasonMessageMap[result.session.end_reason] ||
        "Sesi fokus berhasil dihentikan.",
      session: result.session,
      task: result.task,
    };

    if (result.energy?.summary) {
      response.energy = result.energy.summary;
    }

    if (result.energy?.effects?.length) {
      response.energy_effects = result.energy.effects;
    }

    return res.status(200).json(response);
  } catch (error) {
    return handleFocusError(res, error, "STOP FOCUS SESSION ERROR:");
  }
};