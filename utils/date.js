export const isoOf = d => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
};

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const clampDate = (d, min, max) => {
  const x = new Date(d);
  if (x < min) return new Date(min);
  if (x > max) return new Date(max);
  return x;
};
