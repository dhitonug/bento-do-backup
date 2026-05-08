import * as repo from "./focus.repository.js";
import { triggerNotification } from "../notifications/notifications.service.js";
import { getPagination, buildMeta } from "../../utils/pagination.js";
import { createError, minutesToHours, roundMinutes } from "../../utils/helpers.js";

const calcStreak = (dates) => {
  if (!dates.length) return 0;
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (const d of dates) {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    if (Math.round((cursor - date) / 864e5) === streak) streak++;
    else break;
  }
  return streak;
};

const END_MESSAGES = {
  completed: (min) => `Sesi fokus selesai! Kamu fokus selama ${Math.round(min)} menit. Saatnya istirahat. ☕`,
  escaped: () => `Sesi fokus dihentikan. Jangan menyerah, coba lagi nanti!`,
  zombie_limit: () => `Waktu fokus habis. Istirahat sejenak, lalu lanjutkan! 🧟`,
  crash: () => `Sesi fokus berakhir karena gangguan. Pastikan tetap konsisten!`,
};

const withTimerInfo = (session) => {
  const elapsedMs = Date.now() - new Date(session.started_at).getTime();
  const elapsedMinutes = elapsedMs / (1000 * 60);
  const remainingMinutes = Math.max(0, session.duration_minutes - elapsedMinutes);

  return {
    ...session,
    elapsed_minutes: roundMinutes(elapsedMinutes),
    remaining_minutes: roundMinutes(remainingMinutes),
    is_overdue: remainingMinutes === 0,
  };
};

const getUrgency = (deadline) => {
  if (!deadline) return "normal";
  const hoursLeft = (new Date(deadline) - Date.now()) / (1000 * 60 * 60);
  if (hoursLeft <= 24) return "critical";
  if (hoursLeft <= 72) return "high";
  return "normal";
};

export const startFocusSession = async (userId, body) => {
  const { task_id, timer_duration } = body;

  const active = await repo.findActiveSession(userId);
  if (active) {
    throw createError(
      `Kamu sudah punya sesi fokus aktif untuk tugas "${active.task_title}". Selesaikan dulu sebelum memulai yang baru.`,
      409
    );
  }

  const session = await repo.createSession(userId, task_id, timer_duration);

  triggerNotification(
    userId,
    task_id,
    `Sesi fokus dimulai selama ${timer_duration} menit. Tetap fokus! 💪`,
    "deadline_reminder"
  ).catch(() => { });

  return session;
};

export const getActiveSession = async (userId) => {
  const session = await repo.findActiveSession(userId);
  return session ? withTimerInfo(session) : null;
};

export const endFocusSession = async (userId, sessionId, body) => {
  const { end_reason } = body;

  const existing = await repo.findSessionById(sessionId, userId);
  if (!existing) throw createError("Sesi fokus tidak ditemukan.", 404);
  if (existing.ended_at) throw createError("Sesi fokus ini sudah selesai.", 409);

  const session = await repo.endSession(sessionId, userId, end_reason);

  const msgFn = END_MESSAGES[end_reason] ?? (() => "Sesi fokus berakhir.");
  triggerNotification(
    userId,
    existing.task_id,
    msgFn(session.duration_minutes),
    "deadline_reminder"
  ).catch(() => { });

  return session;
};

export const getSessionHistory = async (userId, query) => {
  const { page, limit, offset } = getPagination(query);
  const filters = {
    task_id: query.task_id,
    end_reason: query.end_reason,
    from: query.from,
    to: query.to,
  };

  const { data, total } = await repo.findSessionHistory(userId, limit, offset, filters);
  return { data, meta: buildMeta(total, page, limit) };
};

export const getFocusStatistics = async (userId) => {
  const [stats, streakDates] = await Promise.all([
    repo.getStatistics(userId),
    repo.getStreakDays(userId),
  ]);

  return {
    today: { sessions: stats.sessions_today, minutes: roundMinutes(stats.minutes_today), hours: minutesToHours(stats.minutes_today) },
    this_week: { sessions: stats.sessions_this_week, minutes: roundMinutes(stats.minutes_this_week), hours: minutesToHours(stats.minutes_this_week) },
    all_time: { sessions: stats.sessions_all_time, minutes: roundMinutes(stats.minutes_all_time), hours: minutesToHours(stats.minutes_all_time) },
    streak: {
      current_days: calcStreak(streakDates),
      active_days_last_30: stats.active_days_last_30,
    },
  };
};

export const getRecommendedTask = async (userId) => {
  const task = await repo.findRecommendedTask(userId);
  if (!task) return null;
  return { ...task, urgency: getUrgency(task.deadline) };
};

export const getSessionDetail = async (userId, sessionId) => {
  const session = await repo.findSessionById(sessionId, userId);
  if (!session) throw createError("Sesi fokus tidak ditemukan.", 404);
  return session;
};
