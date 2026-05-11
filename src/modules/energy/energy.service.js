import { db } from "../../config/db.js";
import * as energyRepo from "./energy.repository.js";

const MAX_FOCUS_MINUTES = 60;
const CRITICAL_ENERGY_THRESHOLD = 30;

const RETROACTIVE_DEDUCTION_MAP = {
  Ringan: 15,
  Sedang: 30,
  Berat: 60,
};

const createAppError = (message, status = 400, extra = {}) => {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
};

const normalizePaginationNumber = (value, fallback) => {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 1) {
    return fallback;
  }

  return numberValue;
};

const clampEnergy = (value, min, max) => {
  return Math.min(max, Math.max(min, value));
};

const buildEnergySummary = (state) => {
  return {
    current_energy: state.current_energy,
    max_energy: state.max_energy,
    is_critical_energy: state.current_energy < CRITICAL_ENERGY_THRESHOLD,
    energy_reset_at: state.energy_reset_at,
  };
};

const assertUserOnly = (identifier) => {
  if (!identifier?.user_id) {
    throw createAppError(
      "Fitur ini hanya untuk pengguna terdaftar. Silakan login terlebih dahulu.",
      403,
      {
        require_login: true,
        code: "LOGIN_REQUIRED_FOR_ENERGY",
      },
    );
  }
};

export const ensureDailyResetForUser = async (userId, executor = db) => {
  if (!userId) {
    return null;
  }

  const state = await energyRepo.getUserEnergyState(
    userId,
    { forUpdate: true },
    executor,
  );

  if (!state) {
    throw createAppError("Pengguna tidak ditemukan!", 404);
  }

  if (!state.needs_reset) {
    return buildEnergySummary(state);
  }

  const before = state.current_energy;
  const after = state.max_energy;

  const updatedState = await energyRepo.updateUserEnergyState(
    userId,
    {
      current_energy: after,
      set_reset_at: true,
    },
    executor,
  );

  const actualChange = after - before;

  if (actualChange !== 0) {
    await energyRepo.createEnergyLog(
      {
        user_id: userId,
        change_amount: actualChange,
        reason: "daily_reset",
        energy_before: before,
        energy_after: after,
      },
      executor,
    );
  }

  return buildEnergySummary(updatedState);
};

const applyEnergyDeltaForUser = async (
  userId,
  { delta, reason, task_id = null, focus_session_id = null },
  executor = db,
) => {
  await ensureDailyResetForUser(userId, executor);

  const state = await energyRepo.getUserEnergyState(
    userId,
    { forUpdate: true },
    executor,
  );

  if (!state) {
    throw createAppError("Pengguna tidak ditemukan!", 404);
  }

  const nextEnergy = clampEnergy(
    state.current_energy + delta,
    0,
    state.max_energy,
  );

  const actualChange = nextEnergy - state.current_energy;

  const updatedState = await energyRepo.updateUserEnergyState(
    userId,
    {
      current_energy: nextEnergy,
      set_reset_at: false,
    },
    executor,
  );

  let effect = null;

  if (actualChange !== 0) {
    const log = await energyRepo.createEnergyLog(
      {
        user_id: userId,
        change_amount: actualChange,
        reason,
        energy_before: state.current_energy,
        energy_after: nextEnergy,
        task_id,
        focus_session_id,
      },
      executor,
    );

    effect = {
      id: log.id,
      change_amount: log.change_amount,
      reason: log.reason,
      energy_before: log.energy_before,
      energy_after: log.energy_after,
      task_id: log.task_id,
      focus_session_id: log.focus_session_id,
      created_at: log.created_at,
    };
  }

  return {
    applied: actualChange !== 0,
    actual_change: actualChange,
    effect,
    summary: buildEnergySummary(updatedState),
  };
};

export const getAvailableFocusMinutes = async (identifier, executor = db) => {
  if (!identifier?.user_id) {
    return MAX_FOCUS_MINUTES;
  }

  const summary = await ensureDailyResetForUser(identifier.user_id, executor);

  return Math.max(0, Math.min(MAX_FOCUS_MINUTES, summary.current_energy));
};

export const applyCompletionRewardIfEligible = async (
  identifier,
  task,
  executor = db,
  focusSessionId = null,
) => {
  if (!identifier?.user_id) {
    return {
      effects: [],
      summary: null,
    };
  }

  if (task.energy_weight !== "Ringan") {
    return {
      effects: [],
      summary: await ensureDailyResetForUser(identifier.user_id, executor),
    };
  }

  const currentSummary = await ensureDailyResetForUser(
    identifier.user_id,
    executor,
  );

  if (currentSummary.current_energy >= CRITICAL_ENERGY_THRESHOLD) {
    return {
      effects: [],
      summary: currentSummary,
    };
  }

  const rescue = await applyEnergyDeltaForUser(
    identifier.user_id,
    {
      delta: 15,
      reason: "dopamine_rescue",
      task_id: task.id,
      focus_session_id: focusSessionId,
    },
    executor,
  );

  return {
    effects: rescue.effect ? [rescue.effect] : [],
    summary: rescue.summary,
  };
};

export const handleTaskCompletionWithoutTimer = async (
  identifier,
  task,
  executor = db,
) => {
  if (!identifier?.user_id) {
    return {
      effects: [],
      summary: null,
    };
  }

  const effects = [];

  const deductionAmount = RETROACTIVE_DEDUCTION_MAP[task.energy_weight] ?? 0;

  let latestSummary = await ensureDailyResetForUser(
    identifier.user_id,
    executor,
  );

  if (deductionAmount > 0) {
    const deduction = await applyEnergyDeltaForUser(
      identifier.user_id,
      {
        delta: -deductionAmount,
        reason: "retroactive_deduction",
        task_id: task.id,
      },
      executor,
    );

    if (deduction.effect) {
      effects.push(deduction.effect);
    }

    latestSummary = deduction.summary;
  }

  const rescue = await applyCompletionRewardIfEligible(
    identifier,
    task,
    executor,
  );

  if (rescue.effects.length > 0) {
    effects.push(...rescue.effects);
    latestSummary = rescue.summary;
  }

  return {
    effects,
    summary: latestSummary,
  };
};

export const handleFocusStopEnergyEffects = async (
  identifier,
  { task, focus_session_id, duration_minutes, completed },
  executor = db,
) => {
  if (!identifier?.user_id) {
    return {
      effects: [],
      summary: null,
    };
  }

  const effects = [];
  let latestSummary = await ensureDailyResetForUser(
    identifier.user_id,
    executor,
  );

  if (duration_minutes > 0) {
    const deduction = await applyEnergyDeltaForUser(
      identifier.user_id,
      {
        delta: -duration_minutes,
        reason: "timer_deduction",
        task_id: task.id,
        focus_session_id,
      },
      executor,
    );

    if (deduction.effect) {
      effects.push(deduction.effect);
    }

    latestSummary = deduction.summary;
  }

  if (completed) {
    const rescue = await applyCompletionRewardIfEligible(
      identifier,
      task,
      executor,
      focus_session_id,
    );

    if (rescue.effects.length > 0) {
      effects.push(...rescue.effects);
      latestSummary = rescue.summary;
    }
  }

  return {
    effects,
    summary: latestSummary,
  };
};

export const getEnergySummary = async (identifier) => {
  assertUserOnly(identifier);

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const summary = await ensureDailyResetForUser(identifier.user_id, client);

    await client.query("COMMIT");

    return summary;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getEnergyLogs = async (
  identifier,
  page = 1,
  limit = 20,
) => {
  assertUserOnly(identifier);

  const normalizedPage = normalizePaginationNumber(page, 1);
  const normalizedLimit = normalizePaginationNumber(limit, 20);
  const offset = (normalizedPage - 1) * normalizedLimit;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await ensureDailyResetForUser(identifier.user_id, client);

    const result = await energyRepo.getEnergyLogsWithPagination(
      identifier.user_id,
      normalizedLimit,
      offset,
      client,
    );

    await client.query("COMMIT");

    const totalPages =
      result.total_items === 0
        ? 0
        : Math.ceil(result.total_items / normalizedLimit);

    return {
      page: normalizedPage,
      limit: normalizedLimit,
      total_items: result.total_items,
      total_pages: totalPages,
      data: result.data,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};