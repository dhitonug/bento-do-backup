import { db } from "../../config/db.js";
import * as taskRepo from "../tasks/tasks.repository.js";
import * as focusRepo from "./focus.repository.js";

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

const enrichActiveSession = (session) => {
  return {
    id: session.id,
    user_id: session.user_id,
    guest_session_id: session.guest_session_id,
    task_id: session.task_id,
    task_title: session.task_title,
    energy_weight: session.energy_weight,
    task_status: session.task_status,
    started_at: session.started_at,
    elapsed_minutes: session.elapsed_minutes,
    remaining_minutes: session.remaining_minutes,
    zombie_limit_reached: session.zombie_limit_reached,
  };
};

const mapStoppedSession = (session, taskMeta = null) => {
  return {
    id: session.id,
    user_id: session.user_id,
    guest_session_id: session.guest_session_id,
    task_id: session.task_id,
    task_title: taskMeta?.task_title ?? null,
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
        energy_weight: task.energy_weight,
        started_at: session.started_at,
        elapsed_minutes: 0,
        remaining_minutes: MAX_FOCUS_MINUTES,
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

  if (activeSession.zombie_limit_reached) {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const stoppedSession = await focusRepo.finalizeFocusSession(
        activeSession.id,
        identifier,
        {
          duration_minutes: MAX_FOCUS_MINUTES,
          end_reason: "zombie_limit",
          use_auto_end_time: true,
        },
        client,
      );

      const updatedTask = await focusRepo.markTaskAfterFocus(
        activeSession.task_id,
        identifier,
        {
          duration_minutes: MAX_FOCUS_MINUTES,
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
        message:
          "Sesi fokus dihentikan otomatis karena mencapai batas maksimal 60 menit.",
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    active_session: enrichActiveSession(activeSession),
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

  let resolvedEndReason = endReason;
  let resolvedDuration = activeSession.elapsed_minutes;
  let useAutoEndTime = false;

  if (activeSession.zombie_limit_reached) {
    resolvedEndReason = "zombie_limit";
    resolvedDuration = MAX_FOCUS_MINUTES;
    useAutoEndTime = true;
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
        use_auto_end_time: useAutoEndTime,
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

    await client.query("COMMIT");

    return {
      session: mapStoppedSession(stoppedSession, activeSession),
      task: updatedTask,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};