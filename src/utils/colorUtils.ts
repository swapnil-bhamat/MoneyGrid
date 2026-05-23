
/**
 * Utility to generate a consistent class name for dynamic backgrounds based on an ID or category.
 * We use a limited set of colors (1-8) to ensure they look good and remain distinct.
 */
export const getDynamicBgClass = (id: number | string | undefined | null): string => {
  if (id === undefined || id === null) return "";
  
  // Hash the ID to get a number between 1 and 8
  const numericId = typeof id === "number" ? id : 
    id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const colorIndex = (Math.abs(numericId) % 8) + 1;
  return `dynamic-bg-${colorIndex}`;
};
