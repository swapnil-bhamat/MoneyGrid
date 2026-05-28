import { ToWords } from 'to-words';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  locale: string;
  name: string;
  plural: string;
  fractionalUnit: string;
  fractionalPlural: string;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  INR: {
    code: "INR",
    symbol: "₹",
    locale: "en-IN",
    name: "Rupee",
    plural: "Rupees",
    fractionalUnit: "Paisa",
    fractionalPlural: "Paise",
  },
  USD: {
    code: "USD",
    symbol: "$",
    locale: "en-US",
    name: "Dollar",
    plural: "Dollars",
    fractionalUnit: "Cent",
    fractionalPlural: "Cents",
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    locale: "en-IE", // standard English European representation
    name: "Euro",
    plural: "Euros",
    fractionalUnit: "Cent",
    fractionalPlural: "Cents",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    locale: "en-GB",
    name: "Pound",
    plural: "Pounds",
    fractionalUnit: "Penny",
    fractionalPlural: "Pence",
  },
};

export const getActiveCurrency = (): CurrencyConfig => {
  const saved = localStorage.getItem("moneygrid_currency") || "INR";
  return CURRENCIES[saved] || CURRENCIES.INR;
};

export const toLocalCurrency = (num: number | undefined | string): string => {
  const currency = getActiveCurrency();
  const parsed = typeof num === "string" ? parseFloat(num) : num;
  if (parsed === undefined || isNaN(parsed)) {
    return `${currency.symbol}0`;
  }
  return `${currency.symbol}${parsed.toLocaleString(currency.locale, { maximumFractionDigits: 2 })}`;
};

export const numberToWords = (num: number): string => {
  if (num === 0) return "";
  const currency = getActiveCurrency();
  try {
    const toWords = new ToWords({
      localeCode: currency.locale === "en-IN" ? "en-IN" : "en-US",
      converterOptions: {
        currency: true,
        ignoreDecimal: false,
        ignoreZeroCurrency: false,
        doNotAddOnly: false,
        currencyOptions: {
          name: currency.name,
          plural: currency.plural,
          symbol: currency.symbol,
          fractionalUnit: {
            name: currency.fractionalUnit,
            plural: currency.fractionalPlural,
            symbol: "",
          },
        }
      }
    });
    return toWords.convert(num);
  } catch (e) {
    console.error("Error converting number to words:", e);
    return "";
  }
};

