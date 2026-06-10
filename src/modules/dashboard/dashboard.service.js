import * as dashboardRepo from "./dashboard.repository.js";
import * as energyService from "../energy/energy.service.js";
import * as notificationsService from "../notifications/notifications.service.js";

// HELPER
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

const DEFAULT_GUEST_MAX_ENERGY = 240;
const DAY_MS = 24 * 60 * 60 * 1000;

const toNumber = (value, fallback = 0) => {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const startOfDay = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDays = (date, amount) =>
  new Date(date.getTime() + amount * DAY_MS);

const startOfWeek = (date) => {
  const day = startOfDay(date);
  const dayIndex = day.getDay();
  const diff = dayIndex === 0 ? -6 : 1 - dayIndex;
  return addDays(day, diff);
};

const startOfMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const startOfYear = (date) => new Date(date.getFullYear(), 0, 1);

const addMonths = (date, amount) =>
  new Date(date.getFullYear(), date.getMonth() + amount, date.getDate());

const addYears = (date, amount) =>
  new Date(date.getFullYear() + amount, date.getMonth(), date.getDate());

const parseDateOnly = (value) => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDateOnly = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDailyLabel = (date) =>
  `${date.getDate()}/${date.getMonth() + 1}`;

const shortDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const shortMonthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const getPeriodWindow = (period, now = new Date()) => {
  if (period === "daily") {
    const currentStart = startOfDay(now);
    const currentEnd = addDays(currentStart, 1);

    return {
      currentStart,
      currentEnd,
      previousStart: addDays(currentStart, -1),
      previousEnd: currentStart,
      chartStart: addDays(currentStart, -6),
      chartEnd: currentEnd,
    };
  }

  if (period === "monthly") {
    const currentStart = startOfMonth(now);
    const currentEnd = addMonths(currentStart, 1);

    return {
      currentStart,
      currentEnd,
      previousStart: addMonths(currentStart, -1),
      previousEnd: currentStart,
      chartStart: currentStart,
      chartEnd: currentEnd,
    };
  }

  if (period === "yearly") {
    const currentStart = startOfYear(now);
    const currentEnd = addYears(currentStart, 1);

    return {
      currentStart,
      currentEnd,
      previousStart: addYears(currentStart, -1),
      previousEnd: currentStart,
      chartStart: currentStart,
      chartEnd: currentEnd,
    };
  }

  const currentStart = startOfWeek(now);
  const currentEnd = addDays(currentStart, 7);

  return {
    currentStart,
    currentEnd,
    previousStart: addDays(currentStart, -7),
    previousEnd: currentStart,
    chartStart: currentStart,
    chartEnd: currentEnd,
  };
};

const buildBins = (period, window) => {
  if (period === "yearly") {
    return Array.from({ length: 12 }, (_, index) => {
      const start = new Date(window.chartStart.getFullYear(), index, 1);

      return {
        label: shortMonthNames[index],
        start,
        end: addMonths(start, 1),
      };
    });
  }

  if (period === "monthly") {
    const bins = [];
    let cursor = new Date(window.chartStart);
    let index = 1;

    while (cursor < window.chartEnd) {
      const end = new Date(
        Math.min(addDays(cursor, 7).getTime(), window.chartEnd.getTime()),
      );

      bins.push({
        label: `W${index}`,
        start: cursor,
        end,
      });

      cursor = end;
      index += 1;
    }

    return bins;
  }

  return Array.from({ length: 7 }, (_, index) => {
    const start = addDays(window.chartStart, index);

    return {
      label:
        period === "daily"
          ? formatDailyLabel(start)
          : shortDayNames[start.getDay()],
      start,
      end: addDays(start, 1),
    };
  });
};

const isWithin = (dateValue, start, end) => {
  if (!dateValue) {
    return false;
  }

  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);

  return date >= start && date < end;
};

const buildTrend = (current, previous) => {
  const currentValue = toNumber(current);
  const previousValue = toNumber(previous);

  if (previousValue === 0) {
    return {
      previous_value: previousValue,
      trend_percent: currentValue === 0 ? 0 : 100,
      trend_direction:
        currentValue === 0 ? "flat" : currentValue > 0 ? "up" : "down",
    };
  }

  const percent = Math.round(
    ((currentValue - previousValue) / previousValue) * 100,
  );

  return {
    previous_value: previousValue,
    trend_percent: percent,
    trend_direction: percent > 0 ? "up" : percent < 0 ? "down" : "flat",
  };
};

const buildMetric = (value, previousValue) => ({
  value: toNumber(value),
  ...buildTrend(value, previousValue),
});

const buildProductivityChart = (period, bins, taskEvents, now = new Date()) =>
  bins.map((bin) => {
    const completed = taskEvents.filter((task) =>
      isWithin(task.completed_at, bin.start, bin.end),
    ).length;

    const overdue = taskEvents.filter((task) => {
      if (!isWithin(task.deadline, bin.start, bin.end)) {
        return false;
      }

      const deadline = new Date(task.deadline);
      const completedAt = task.completed_at
        ? new Date(task.completed_at)
        : null;

      return (
        (task.status !== "done" && deadline < now) ||
        (completedAt && completedAt > deadline)
      );
    }).length;

    return {
      label: bin.label,
      date: formatDateOnly(bin.start),
      completed,
      overdue,
      total: completed + overdue,
      tooltip: {
        title: period === "daily" ? formatDailyLabel(bin.start) : bin.label,
        completed,
        overdue,
      },
    };
  });

const normalizePaginationNumber = (value, fallback) => {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 1) {
    return fallback;
  }

  return numberValue;
};

const getEnergySummaryForIdentifier = async (identifier) => {
  if (!identifier.user_id) {
    return {
      current_energy: DEFAULT_GUEST_MAX_ENERGY,
      max_energy: DEFAULT_GUEST_MAX_ENERGY,
      is_critical_energy: false,
      energy_reset_at: null,
    };
  }

  return await energyService.ensureDailyResetForUser(identifier.user_id);
};

const buildFocusSummaryResponse = (summary) => {
  const totalMinutes = toNumber(summary.total_focus_minutes);

  return {
    total_focus_minutes: totalMinutes,
    total_focus_time_label: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
    total_sessions: toNumber(summary.total_sessions),
    average_focus_score: null,
    longest_session_minutes: toNumber(summary.longest_session_minutes),
    completed_sessions: toNumber(summary.completed_sessions),
  };
};

// GET ZEN DASHBOARD
export const getZenDashboard = async (identifier) => {
  assertIdentifier(identifier);

  if (identifier.user_id) {
    await energyService.ensureDailyResetForUser(identifier.user_id);
  }

  const result = await dashboardRepo.getZenDashboardData(identifier);

  return {
    current_energy: result.current_energy,
    max_energy: result.max_energy,
    is_critical_energy: result.current_energy < 30,
    hidden_count: result.hidden_count,
    hidden_message:
      result.hidden_count > 0
        ? "Sistem menyembunyikan sisa tugas untuk melindungi energi mental Anda."
        : null,
    data: result.data,
  };
};

export const getDashboardOverview = async (identifier, query = {}) => {
  assertIdentifier(identifier);

  const period = query.period || "weekly";
  const now = new Date();
  const window = getPeriodWindow(period, now);
  const bins = buildBins(period, window);
  const monthDate = query.month ? parseDateOnly(query.month) : now;
  const monthStart = startOfMonth(monthDate);
  const energy = await getEnergySummaryForIdentifier(identifier);

  const [
    zenDashboard,
    stats,
    taskEvents,
    recentTasks,
    calendarRows,
    focusSummary,
    notifications,
  ] = await Promise.all([
    dashboardRepo.getZenDashboardData(identifier),
    dashboardRepo.getTaskStats(identifier, window),
    dashboardRepo.getTaskEventsForRange(identifier, {
      start: window.chartStart,
      end: window.chartEnd,
    }),
    dashboardRepo.getRecentTasks(identifier, {
      limit: 5,
      calendarDate: query.calendar_date ?? null,
    }),
    dashboardRepo.getCalendarTaskCounts(identifier, {
      start: monthStart,
      end: addMonths(monthStart, 1),
    }),
    dashboardRepo.getFocusSummary(identifier, {
      start: window.currentStart,
      end: window.currentEnd,
    }),
    identifier.user_id
      ? notificationsService.getUserNotifications(identifier.user_id, {
          page: 1,
          limit: 5,
        })
      : Promise.resolve({
          unread_count: 0,
          data: [],
        }),
  ]);

  const energyPercent =
    energy.max_energy > 0
      ? Math.round((energy.current_energy / energy.max_energy) * 100)
      : 0;

  return {
    period,
    range: {
      current_start: window.currentStart,
      current_end: window.currentEnd,
      previous_start: window.previousStart,
      previous_end: window.previousEnd,
    },
    metrics: {
      task_completed: buildMetric(
        stats.completed_current,
        stats.completed_previous,
      ),
      upcoming_deadlines: buildMetric(
        stats.upcoming_current,
        stats.upcoming_previous,
      ),
      overdue_tasks: buildMetric(stats.overdue_current, stats.overdue_previous),
      energy: {
        value: energy.current_energy,
        max_value: energy.max_energy,
        percentage: energyPercent,
        is_critical_energy: energy.is_critical_energy,
        energy_reset_at: energy.energy_reset_at,
      },
    },
    priority_tasks: {
      current_energy: zenDashboard.current_energy,
      max_energy: zenDashboard.max_energy,
      hidden_count: zenDashboard.hidden_count,
      hidden_message:
        zenDashboard.hidden_count > 0
          ? "Sistem menyembunyikan sisa tugas untuk melindungi energi mental Anda."
          : null,
      data: zenDashboard.data,
    },
    productivity: {
      period,
      data: buildProductivityChart(period, bins, taskEvents, now),
    },
    recent_tasks: {
      selected_date: query.calendar_date ?? null,
      data: recentTasks,
    },
    calendar: {
      month: formatDateOnly(monthStart),
      selected_date: query.calendar_date ?? null,
      data: calendarRows,
    },
    focus_summary: buildFocusSummaryResponse(focusSummary),
    notifications: {
      unread_count: notifications.unread_count ?? 0,
      data: notifications.data ?? [],
    },
  };
};

export const getDashboardHistory = async (identifier, query = {}) => {
  assertIdentifier(identifier);

  const page = normalizePaginationNumber(query.page, 1);
  const limit = normalizePaginationNumber(query.limit, 20);
  const offset = (page - 1) * limit;
  const from = query.from ? parseDateOnly(query.from) : null;
  const to = query.to ? addDays(parseDateOnly(query.to), 1) : null;

  const [history, focusSummary] = await Promise.all([
    dashboardRepo.getHistoryItems(identifier, {
      type: query.type || "all",
      from,
      to,
      limit,
      offset,
    }),
    dashboardRepo.getFocusSummary(identifier, {
      start: from,
      end: to,
    }),
  ]);

  const totalPages =
    history.total_items === 0 ? 0 : Math.ceil(history.total_items / limit);

  return {
    type: query.type || "all",
    from: query.from ?? null,
    to: query.to ?? null,
    page,
    limit,
    total_items: history.total_items,
    total_pages: totalPages,
    summary: buildFocusSummaryResponse(focusSummary),
    data: history.data,
  };
};
