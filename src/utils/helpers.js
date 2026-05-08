/**
 * Membuat error object dengan HTTP status code.
 * @param {string} message
 * @param {number} status
 * @returns {Error}
 */
export const createError = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/**
 * Helper untuk mengkonversi menit ke format jam yang rapi.
 * @param {number} minutes
 * @returns {number}
 */
export const minutesToHours = (minutes) =>
  parseFloat(((minutes || 0) / 60).toFixed(2));

/**
 * Helper round menit ke 1 desimal.
 * @param {number} minutes
 * @returns {number}
 */
export const roundMinutes = (minutes) =>
  parseFloat((minutes || 0).toFixed(1));
