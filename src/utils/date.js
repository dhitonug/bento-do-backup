export const toPostgresTimestamp = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().replace("T", " ").replace("Z", "");
};
