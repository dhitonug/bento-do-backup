import * as taskRepo from "../tasks/tasks.repository.js";

export const getZenDashboardData = async (identifier) => {
  return await taskRepo.getZenDashboardTasks(identifier);
};