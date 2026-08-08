export function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function percentage(value, max) {
  const val = Number(value) || 0;
  const mx = Number(max) || 0;
  if (!mx || mx <= 0 || isNaN(val) || isNaN(mx)) return "0%";
  return `${Math.min(100, Math.max(0, Math.round((val / mx) * 100)))}%`;
}
