/**
 * Helper function to convert DD-MM-YYYY (stored format) to YYYY-MM-DD (datepicker input format)
 */
export function convertToDateInputFormat(dateStr: string): string {
  if (!dateStr || dateStr.trim() === "") return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return "";
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Helper function to convert YYYY-MM-DD (datepicker input format) to DD-MM-YYYY (stored format)
 */
export function convertFromDateInputFormat(dateStr: string): string {
  if (!dateStr || dateStr.trim() === "") return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return "";
  const [year, month, day] = parts;
  return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
}
