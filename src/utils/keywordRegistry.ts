import { t } from "@/utils/localization";

export interface KeywordDetail {
  keyword: string;
  icon: string;        // Unicode emoji/icon character
  color: string;       // Bootstrap color class suffix: 'danger', 'warning', 'success', etc.
  hex: string;         // Constant hex value for charts/canvas
}

interface BaseKeyword {
  key: string;              // Standard localization key under t.keywords
  defaultKeyword: string;   // Default fallback English keyword name
  icon: string;
  color: string;
  hex: string;
  aliases?: string[];       // Any other words that map to this keyword
}

const BASE_KEYWORDS: BaseKeyword[] = [
  { key: "need", defaultKeyword: "Need", icon: "🎯", color: "danger", hex: "#e74c3c", aliases: ["needs"] },
  { key: "want", defaultKeyword: "Want", icon: "🌟", color: "warning", hex: "#f1c40f", aliases: ["wants"] },
  { key: "saving", defaultKeyword: "Saving", icon: "💰", color: "success", hex: "#2ecc71", aliases: ["savings"] },
  { key: "emergency", defaultKeyword: "Emergency Fund", icon: "🛟", color: "danger", hex: "#c0392b" },
  { key: "retirement", defaultKeyword: "Retirement", icon: "🏖️", color: "primary", hex: "#8e44ad" },
  { key: "education", defaultKeyword: "Education", icon: "🎓", color: "info", hex: "#3498db" },
  { key: "marriage", defaultKeyword: "Marriage", icon: "💍", color: "pink", hex: "#e84393" },
  { key: "equity", defaultKeyword: "Equity", icon: "📈", color: "info", hex: "#3498db" },
  { key: "stock", defaultKeyword: "Stock", icon: "📊", color: "primary", hex: "#2980b9", aliases: ["stocks"] },
  { key: "debt", defaultKeyword: "Debt", icon: "📉", color: "secondary", hex: "#95a5a6" },
  { key: "liquid", defaultKeyword: "Liquid", icon: "💧", color: "info", hex: "#1abc9c" },
  { key: "gold", defaultKeyword: "Gold", icon: "🪙", color: "warning", hex: "#f39c12" },
  { key: "bitcoin", defaultKeyword: "Bitcoin", icon: "₿", color: "dark", hex: "#f7931a" },
  { key: "commodity", defaultKeyword: "Commodity", icon: "📦", color: "secondary", hex: "#7f8c8d" },
  { key: "reit", defaultKeyword: "REIT", icon: "🏢", color: "dark", hex: "#34495e" },
  { key: "realEstate", defaultKeyword: "Real Estate", icon: "🏠", color: "dark", hex: "#2c3e50", aliases: ["real estate", "property"] },
  { key: "sip", defaultKeyword: "SIP", icon: "🔁", color: "primary", hex: "#16a085" },
  { key: "mutualFund", defaultKeyword: "Mutual Fund", icon: "💼", color: "primary", hex: "#2980b9", aliases: ["mutual", "mutual fund"] },
  { key: "fd", defaultKeyword: "Fixed Deposit", icon: "🏦", color: "secondary", hex: "#7f8c8d" },
  { key: "epf", defaultKeyword: "EPF", icon: "🧾", color: "success", hex: "#27ae60" },
  { key: "ssy", defaultKeyword: "SSY", icon: "👧", color: "warning", hex: "#f39c12" },
  { key: "income", defaultKeyword: "Income", icon: "💵", color: "success", hex: "#2ecc71" },
  { key: "salary", defaultKeyword: "Salary", icon: "🧑‍💼", color: "success", hex: "#27ae60" },
  { key: "expense", defaultKeyword: "Expense", icon: "💳", color: "danger", hex: "#e74c3c" },
  { key: "emi", defaultKeyword: "EMI", icon: "📅", color: "danger", hex: "#c0392b" },
  { key: "insurance", defaultKeyword: "Insurance", icon: "🛡️", color: "info", hex: "#2980b9" },
  { key: "donation", defaultKeyword: "Donation", icon: "🤝", color: "secondary", hex: "#8e44ad" },
  { key: "loan", defaultKeyword: "Loan", icon: "🏦", color: "danger", hex: "#d35400" },
  { key: "liability", defaultKeyword: "Liability", icon: "⚠️", color: "danger", hex: "#e74c3c" },
  { key: "shortTerm", defaultKeyword: "Short Term", icon: "⏳", color: "warning", hex: "#f39c12", aliases: ["short"] },
  { key: "longTerm", defaultKeyword: "Long Term", icon: "🕰️", color: "primary", hex: "#8e44ad", aliases: ["long"] },
  { key: "health", defaultKeyword: "Health", icon: "🏥", color: "success", hex: "#2ecc71", aliases: ["health insurance", "medical", "mediclaim"] },
  { key: "life", defaultKeyword: "Life", icon: "🛡️", color: "primary", hex: "#3498db", aliases: ["life insurance", "term", "term insurance"] },
  { key: "bike", defaultKeyword: "Bike", icon: "🏍️", color: "warning", hex: "#e67e22", aliases: ["bike insurance", "two wheeler", "motorcycle"] },
  { key: "car", defaultKeyword: "Car", icon: "🚗", color: "info", hex: "#2980b9", aliases: ["car insurance", "four wheeler"] },
];

// Dynamically construct KEYWORD_MAP for 100% backward compatibility
export const KEYWORD_MAP: Record<string, KeywordDetail> = {};

BASE_KEYWORDS.forEach((item) => {
  const detail: KeywordDetail = {
    keyword: item.defaultKeyword,
    icon: item.icon,
    color: item.color,
    hex: item.hex,
  };
  
  // Register under base key
  KEYWORD_MAP[item.key.toLowerCase()] = detail;
  
  // Register under aliases
  if (item.aliases) {
    item.aliases.forEach((alias) => {
      KEYWORD_MAP[alias.toLowerCase()] = detail;
    });
  }
});

/**
 * Normalizes and returns styling details for a given category, budget category, or financial keyword.
 */
export const getKeywordDetails = (name: string | undefined | null): KeywordDetail => {
  if (!name) return { keyword: "", icon: "❓", color: "secondary", hex: "#7f8c8d" };
  const normalized = name.toLowerCase().trim();

  // Find matching base keyword or alias
  const match = BASE_KEYWORDS.find((item) => {
    if (item.key.toLowerCase() === normalized) return true;
    if (item.aliases?.some((alias) => alias.toLowerCase() === normalized)) return true;
    return false;
  }) || BASE_KEYWORDS.find((item) => {
    if (normalized.includes(item.key.toLowerCase())) return true;
    if (item.aliases?.some((alias) => normalized.includes(alias.toLowerCase()))) return true;
    return false;
  });

  if (match) {
    // Localize keyword name if translated key matches
    const localizedKeyword = (t.keywords as any)[match.key] || match.defaultKeyword;
    return {
      keyword: localizedKeyword,
      icon: match.icon,
      color: match.color,
      hex: match.hex,
    };
  }

  return { keyword: name, icon: "🏷️", color: "secondary", hex: "#95a5a6" };
};
