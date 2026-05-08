import * as service from "./focus.service.js";
import * as resp from "../../utils/response.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
    startSessionSchema,
    endSessionSchema,
    sessionIdParamSchema,
    historyQuerySchema,
} from "./focus.validation.js";

export const validateStartBody = validate(startSessionSchema, "body");
export const validateEndBody = validate(endSessionSchema, "body");
export const validateSessionId = validate(sessionIdParamSchema, "params");
export const validateHistoryQuery = validate(historyQuerySchema, "query");

export const startSession = async (req, res, next) => {
    try {
        const session = await service.startFocusSession(req.user.id, req.body);
        return resp.success(res, session, "Sesi fokus berhasil dimulai. Tetap fokus! 💪", 201);
    } catch (err) {
        next(err);
    }
};

export const getActiveSession = async (req, res, next) => {
    try {
        const session = await service.getActiveSession(req.user.id);
        const msg = session ? "Sesi fokus aktif ditemukan." : "Tidak ada sesi fokus yang sedang aktif.";
        return resp.success(res, session, msg);
    } catch (err) {
        next(err);
    }
};

export const endSession = async (req, res, next) => {
    try {
        const session = await service.endFocusSession(req.user.id, req.params.id, req.body);
        return resp.success(res, session, "Sesi fokus berhasil diakhiri.");
    } catch (err) {
        next(err);
    }
};

export const getSessionHistory = async (req, res, next) => {
    try {
        const result = await service.getSessionHistory(req.user.id, req.query);
        return resp.paginated(res, result.data, result.meta, "Riwayat sesi fokus berhasil diambil.");
    } catch (err) {
        next(err);
    }
};

export const getSessionDetail = async (req, res, next) => {
    try {
        const session = await service.getSessionDetail(req.user.id, req.params.id);
        return resp.success(res, session, "Detail sesi fokus berhasil diambil.");
    } catch (err) {
        next(err);
    }
};

export const getStatistics = async (req, res, next) => {
    try {
        const stats = await service.getFocusStatistics(req.user.id);
        return resp.success(res, stats, "Statistik fokus berhasil diambil.");
    } catch (err) {
        next(err);
    }
};

export const getRecommendedTask = async (req, res, next) => {
    try {
        const task = await service.getRecommendedTask(req.user.id);
        const msg = task
            ? "Tugas rekomendasi fokus berhasil diambil."
            : "Tidak ada tugas aktif saat ini. Semua sudah selesai! 🎉";
        return resp.success(res, task, msg);
    } catch (err) {
        next(err);
    }
};
