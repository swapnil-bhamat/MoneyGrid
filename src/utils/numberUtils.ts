export const toLocalCurrency = (num: number | undefined | string): string => {
  return num
    ? `₹${num?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
    : "₹0";
};

import { ToWords } from 'to-words';

const toWords = new ToWords({
  localeCode: 'en-IN',
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
    doNotAddOnly: false,
    currencyOptions: { // can be used to override defaults for the selected locale
      name: 'Rupee',
      plural: 'Rupees',
      symbol: '₹',
      fractionalUnit: {
        name: 'Paisa',
        plural: 'Paise',
        symbol: '',
      },
    }
  }
});

export const numberToWords = (num: number): string => {
  if (num === 0) return "";
  try {
      return toWords.convert(num);
  } catch (e) {
      console.error("Error converting number to words:", e);
      return "";
  }
};
