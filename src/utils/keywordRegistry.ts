export interface KeywordDetail {
  keyword: string;
  icon: string;        // Unicode emoji/icon character
  color: string;       // Bootstrap color class suffix: 'danger', 'warning', 'success', 'info', etc.
  hex: string;         // Constant hex value for charts/canvas
}
export const KEYWORD_MAP: Record<string, KeywordDetail> = {
  // Purpose / Planning
  need: {
    keyword: "Need",
    icon: "🎯",
    color: "danger",
    hex: "#e74c3c",
  },
  needs: {
    keyword: "Need",
    icon: "🎯",
    color: "danger",
    hex: "#e74c3c",
  },

  want: {
    keyword: "Want",
    icon: "🌟",
    color: "warning",
    hex: "#f1c40f",
  },
  wants: {
    keyword: "Want",
    icon: "🌟",
    color: "warning",
    hex: "#f1c40f",
  },

  saving: {
    keyword: "Saving",
    icon: "💰",
    color: "success",
    hex: "#2ecc71",
  },
  savings: {
    keyword: "Saving",
    icon: "💰",
    color: "success",
    hex: "#2ecc71",
  },

  emergency: {
    keyword: "Emergency Fund",
    icon: "🛟",
    color: "danger",
    hex: "#c0392b",
  },

  retirement: {
    keyword: "Retirement",
    icon: "🏖️",
    color: "primary",
    hex: "#8e44ad",
  },

  education: {
    keyword: "Education",
    icon: "🎓",
    color: "info",
    hex: "#3498db",
  },

  marriage: {
    keyword: "Marriage",
    icon: "💍",
    color: "pink",
    hex: "#e84393",
  },

  // Asset Classes
  equity: {
    keyword: "Equity",
    icon: "📈",
    color: "info",
    hex: "#3498db",
  },

  stock: {
    keyword: "Stock",
    icon: "📊",
    color: "primary",
    hex: "#2980b9",
  },

  stocks: {
    keyword: "Stock",
    icon: "📊",
    color: "primary",
    hex: "#2980b9",
  },

  debt: {
    keyword: "Debt",
    icon: "📉",
    color: "secondary",
    hex: "#95a5a6",
  },

  liquid: {
    keyword: "Liquid",
    icon: "💧",
    color: "info",
    hex: "#1abc9c",
  },

  gold: {
    keyword: "Gold",
    icon: "🪙",
    color: "warning",
    hex: "#f39c12",
  },

  bitcoin: {
    keyword: "Bitcoin",
    icon: "₿",
    color: "dark",
    hex: "#f7931a",
  },

  commodity: {
    keyword: "Commodity",
    icon: "📦",
    color: "secondary",
    hex: "#7f8c8d",
  },

  reit: {
    keyword: "REIT",
    icon: "🏢",
    color: "dark",
    hex: "#34495e",
  },

  "real estate": {
    keyword: "Real Estate",
    icon: "🏠",
    color: "dark",
    hex: "#2c3e50",
  },

  property: {
    keyword: "Real Estate",
    icon: "🏠",
    color: "dark",
    hex: "#2c3e50",
  },

  // Investment Types
  sip: {
    keyword: "SIP",
    icon: "🔁",
    color: "primary",
    hex: "#16a085",
  },

  mutual: {
    keyword: "Mutual Fund",
    icon: "💼",
    color: "primary",
    hex: "#2980b9",
  },

  "mutual fund": {
    keyword: "Mutual Fund",
    icon: "💼",
    color: "primary",
    hex: "#2980b9",
  },

  fd: {
    keyword: "Fixed Deposit",
    icon: "🏦",
    color: "secondary",
    hex: "#7f8c8d",
  },

  epf: {
    keyword: "EPF",
    icon: "🧾",
    color: "success",
    hex: "#27ae60",
  },

  ssy: {
    keyword: "SSY",
    icon: "👧",
    color: "warning",
    hex: "#f39c12",
  },

  // Cash Flow
  income: {
    keyword: "Income",
    icon: "💵",
    color: "success",
    hex: "#2ecc71",
  },

  salary: {
    keyword: "Salary",
    icon: "🧑‍💼",
    color: "success",
    hex: "#27ae60",
  },

  expense: {
    keyword: "Expense",
    icon: "💳",
    color: "danger",
    hex: "#e74c3c",
  },

  emi: {
    keyword: "EMI",
    icon: "📅",
    color: "danger",
    hex: "#c0392b",
  },

  insurance: {
    keyword: "Insurance",
    icon: "🛡️",
    color: "info",
    hex: "#2980b9",
  },

  donation: {
    keyword: "Donation",
    icon: "🤝",
    color: "secondary",
    hex: "#8e44ad",
  },

  // Loans / Liabilities
  loan: {
    keyword: "Loan",
    icon: "🏦",
    color: "danger",
    hex: "#d35400",
  },

  liability: {
    keyword: "Liability",
    icon: "⚠️",
    color: "danger",
    hex: "#e74c3c",
  },

  // Time Buckets
  short: {
    keyword: "Short Term",
    icon: "⏳",
    color: "warning",
    hex: "#f39c12",
  },

  long: {
    keyword: "Long Term",
    icon: "🕰️",
    color: "primary",
    hex: "#8e44ad",
  },
};

/**
 * Normalizes and returns styling details for a given category, budget category, or financial keyword.
 */
export const getKeywordDetails = (name: string | undefined | null): KeywordDetail => {
  if (!name) return { keyword: "", icon: "❓", color: "secondary", hex: "#7f8c8d" };
  const normalized = name.toLowerCase().trim();
  
  // 1. Exact match
  if (KEYWORD_MAP[normalized]) {
    return KEYWORD_MAP[normalized];
  }
  
  // 2. Partial/contains match
  for (const [key, value] of Object.entries(KEYWORD_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // 3. Fallback default
  return { keyword: name, icon: "🏷️", color: "secondary", hex: "#95a5a6" };
};
