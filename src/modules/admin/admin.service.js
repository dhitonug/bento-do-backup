import * as adminRepo from "./admin.repository.js";
import * as templatesRepo from "../templates/templates.repository.js";

const createAppError = (message, status = 400, extra = {}) => {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
};

const DAY_MS = 24 * 60 * 60 * 1000;
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

const formatDateOnly = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDailyLabel = (date) =>
  `${date.getDate()}/${date.getMonth() + 1}`;

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

const buildMetric = (totalValue, currentValue, previousValue) => ({
  value: toNumber(totalValue),
  current_period_value: toNumber(currentValue),
  ...buildTrend(currentValue, previousValue),
});

const normalizePaginationNumber = (value, fallback) => {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 1) {
    return fallback;
  }

  return numberValue;
};

export const getDashboard = async (query = {}) => {
  const period = query.period || "weekly";
  const window = getPeriodWindow(period);
  const bins = buildBins(period, window);

  const [stats, activity, activityEvents, recentTemplates] = await Promise.all([
    adminRepo.getAdminStatsWithPeriod(window),
    adminRepo.getUserActivityLastSevenDays(),
    adminRepo.getUserActivityForRange({
      start: window.chartStart,
      end: window.chartEnd,
    }),
    adminRepo.listRecentTemplates(),
  ]);

  const activityItems = bins.map((bin) => {
    const guestUsers = activityEvents.filter(
      (event) =>
        event.source === "guest" && isWithin(event.created_at, bin.start, bin.end),
    ).length;
    const users = activityEvents.filter(
      (event) =>
        event.source === "user" && isWithin(event.created_at, bin.start, bin.end),
    ).length;

    return {
      label: bin.label,
      date: formatDateOnly(bin.start),
      guest_users: guestUsers,
      users,
      total: guestUsers + users,
    };
  });

  return {
    period,
    stats: {
      guest_users: stats.guest_users,
      users: stats.users,
      tasks: stats.tasks,
      templates: stats.templates,
    },
    metrics: {
      guest_users: buildMetric(
        stats.guest_users,
        stats.guest_users_current,
        stats.guest_users_previous,
      ),
      users: buildMetric(stats.users, stats.users_current, stats.users_previous),
      tasks: buildMetric(stats.tasks, stats.tasks_current, stats.tasks_previous),
      templates: buildMetric(
        stats.templates,
        stats.templates_current,
        stats.templates_previous,
      ),
    },
    activity: {
      ...activity,
      period,
      items: activityItems,
    },
    recent_templates: recentTemplates,
  };
};

export const getTemplates = async (query = {}) => {
  const page = normalizePaginationNumber(query.page, 1);
  const limit = normalizePaginationNumber(query.limit, 20);
  const offset = (page - 1) * limit;
  const templates = await adminRepo.listTemplates();
  const data = templates.slice(offset, offset + limit);

  return {
    page,
    limit,
    total_items: templates.length,
    total_pages:
      templates.length === 0 ? 0 : Math.ceil(templates.length / limit),
    data,
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
