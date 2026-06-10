import { db } from "../../config/db.js";
import * as taskRepo from "../tasks/tasks.repository.js";
import * as focusRepo from "./focus.repository.js";
import * as energyService from "../energy/energy.service.js";
import * as notificationsService from "../notifications/notifications.service.js";

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

const MAX_FOCUS_MINUTES = focusRepo.getMaxFocusMinutes();

const buildTiming = (rawElapsedMinutes, sessionLimitMinutes) => {
  const elapsed = Math.min(rawElapsedMinutes, sessionLimitMinutes);
  const remaining = Math.max(0, sessionLimitMinutes - elapsed);
  const zombieReached = rawElapsedMinutes >= sessionLimitMinutes;

  return {
    elapsed_minutes: elapsed,
    remaining_minutes: remaining,
    zombie_limit_reached: zombieReached,
    session_limit_minutes: sessionLimitMinutes,
  };
};

const enrichActiveSession = (session, timing) => {
  return {
    id: session.id,
    user_id: session.user_id,
    guest_session_id: session.guest_session_id,
    task_id: session.task_id,
    task_title: session.task_title,
    task_description: session.task_description,
    energy_weight: session.energy_weight,
    task_status: session.task_status,
    started_at: session.started_at,
    elapsed_minutes: timing.elapsed_minutes,
    remaining_minutes: timing.remaining_minutes,
    session_limit_minutes: timing.session_limit_minutes,
    zombie_limit_reached: timing.zombie_limit_reached,
  };
};

const mapStoppedSession = (session, taskMeta = null) => {
  return {
    id: session.id,
    user_id: session.user_id,
    guest_session_id: session.guest_session_id,
    task_id: session.task_id,
    task_title: taskMeta?.task_title ?? null,
    task_description: taskMeta?.task_description ?? null,
    energy_weight: taskMeta?.energy_weight ?? null,
    started_at: session.started_at,
    ended_at: session.ended_at,
    duration_minutes: session.duration_minutes,
    end_reason: session.end_reason,
    created_at: session.created_at,
    updated_at: session.updated_at,
  };
};

export const startFocusSession = async (identifier, taskId) => {
  assertIdentifier(identifier);

  const task = await taskRepo.getTaskById(taskId, identifier);

  if (!task) {
    throw createAppError("Tugas tidak ditemukan!", 404);
  }

  if (task.status === "done") {
    throw createAppError(
      "Tugas yang sudah selesai tidak bisa memulai sesi fokus lagi.",
      400,
    );
  }

  const existingActiveSession =
    await focusRepo.findActiveFocusSessionByIdentifier(identifier);

  if (existingActiveSession) {
    throw createAppError(
      "Masih ada sesi fokus aktif. Selesaikan atau hentikan sesi yang berjalan terlebih dahulu.",
      409,
      {
        code: "ACTIVE_FOCUS_SESSION_EXISTS",
      },
    );
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const sessionLimitMinutes =
      await energyService.getAvailableFocusMinutes(identifier, client);

    if (sessionLimitMinutes <= 0) {
      throw createAppError(
        "Energi harian kamu habis. Tunggu reset berikutnya untuk memulai fokus lagi.",
        403,
        {
          code: "ENERGY_DEPLETED",
        },
      );
    }

    await focusRepo.markTaskInProgress(task.id, identifier, client);

    const session = await focusRepo.createFocusSession(
      {
        user_id: identifier.user_id ?? null,
        guest_session_id: identifier.guest_session_id ?? null,
        task_id: task.id,
      },
      client,
    );

    await client.query("COMMIT");

    return {
      data: {
        id: session.id,
        user_id: session.user_id,
        guest_session_id: session.guest_session_id,
        task_id: session.task_id,
        task_title: task.title,
        task_description: task.description,
        energy_weight: task.energy_weight,
        started_at: session.started_at,
        elapsed_minutes: 0,
        remaining_minutes: sessionLimitMinutes,
        session_limit_minutes: sessionLimitMinutes,
        zombie_limit_reached: false,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getActiveFocusSession = async (identifier) => {
  assertIdentifier(identifier);

  const activeSession =
    await focusRepo.findActiveFocusSessionByIdentifier(identifier);

  if (!activeSession) {
    return {
      active_session: null,
      auto_stopped_session: null,
    };
  }

  const sessionLimitMinutes =
    await energyService.getAvailableFocusMinutes(identifier);

  const timing = buildTiming(
    activeSession.raw_elapsed_minutes,
    sessionLimitMinutes,
  );

  if (timing.zombie_limit_reached) {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const stoppedSession = await focusRepo.finalizeFocusSession(
        activeSession.id,
        identifier,
        {
          duration_minutes: sessionLimitMinutes,
          end_reason: "zombie_limit",
          auto_end_limit_minutes: sessionLimitMinutes,
        },
        client,
      );

      const updatedTask = await focusRepo.markTaskAfterFocus(
        activeSession.task_id,
        identifier,
        {
          duration_minutes: sessionLimitMinutes,
          completed: false,
        },
        client,
      );

      await notificationsService.syncDeadlineReminderForTask(
        updatedTask,
        client,
      );

      const energy = await energyService.handleFocusStopEnergyEffects(
        identifier,
        {
          task: updatedTask,
          focus_session_id: stoppedSession.id,
          duration_minutes: sessionLimitMinutes,
          completed: false,
        },
        client,
      );

      await client.query("COMMIT");

      return {
        active_session: null,
        auto_stopped_session: {
          session: mapStoppedSession(stoppedSession, activeSession),
          task: updatedTask,
        },
        energy: energy.summary,
        energy_effects: energy.effects,
        message:
          "Sesi fokus dihentikan otomatis karena mencapai batas maksimal durasi yang diizinkan.",
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    active_session: enrichActiveSession(activeSession, timing),
    auto_stopped_session: null,
  };
};

export const stopFocusSession = async (identifier, sessionId, endReason) => {
  assertIdentifier(identifier);

  const activeSession = await focusRepo.findActiveFocusSessionById(
    sessionId,
    identifier,
  );

  if (!activeSession) {
    throw createAppError("Sesi fokus aktif tidak ditemukan!", 404);
  }

  const sessionLimitMinutes =
    await energyService.getAvailableFocusMinutes(identifier);

  const timing = buildTiming(
    activeSession.raw_elapsed_minutes,
    sessionLimitMinutes,
  );

  let resolvedEndReason = endReason;
  let resolvedDuration = timing.elapsed_minutes;
  let autoEndLimitMinutes = null;

  if (timing.zombie_limit_reached) {
    resolvedEndReason = "zombie_limit";
    resolvedDuration = sessionLimitMinutes;
    autoEndLimitMinutes = sessionLimitMinutes;
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const stoppedSession = await focusRepo.finalizeFocusSession(
      sessionId,
      identifier,
      {
        duration_minutes: resolvedDuration,
        end_reason: resolvedEndReason,
        auto_end_limit_minutes: autoEndLimitMinutes,
      },
      client,
    );

    const updatedTask = await focusRepo.markTaskAfterFocus(
      activeSession.task_id,
      identifier,
      {
        duration_minutes: resolvedDuration,
        completed: resolvedEndReason === "completed",
      },
      client,
    );

    await notificationsService.syncDeadlineReminderForTask(
      updatedTask,
      client,
    );

    const energy = await energyService.handleFocusStopEnergyEffects(
      identifier,
      {
        task: updatedTask,
        focus_session_id: stoppedSession.id,
        duration_minutes: resolvedDuration,
        completed: resolvedEndReason === "completed",
      },
      client,
    );

    await client.query("COMMIT");

    return {
      session: mapStoppedSession(stoppedSession, activeSession),
      task: updatedTask,
      energy,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
