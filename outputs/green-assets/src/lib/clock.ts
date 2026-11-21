export function localDate(offset = 0, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + offset);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
export function realDate(s: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    localDate(0, new Date(s + "T12:00:00")) === s
  );
}
