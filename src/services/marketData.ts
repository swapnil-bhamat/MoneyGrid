import { logError } from "@/services/logger";

import { getAppConfig, CONFIG_KEYS } from "./configService";

// const GOLD_API_KEY = import.meta.env.VITE_GOLD_API_KEY; // Removed in favor of dynamic config

const CACHE_KEYS = {
  GOLD: "market_data_gold_v2",
  SILVER: "market_data_silver_v2",
};

// Cache duration in milliseconds
const CACHE_DURATION = {
  GOLD: 24 * 60 * 60 * 1000, // 24 hours
  SILVER: 24 * 60 * 60 * 1000, // 24 hours
};

interface CachedData<T> {
  data: T;
  timestamp: number;
}

export interface GoldData {
  price_gram_24k: number;
  price_gram_22k: number;
  price_gram_21k: number;
  price_gram_18k: number;
  currency: string;
  timestamp: number;
}

export interface SilverData {
  price_gram_24k: number;
  currency: string;
  timestamp: number;
}

export interface GoldApiStats {
  requests_today: number;
  requests_yesterday: number;
  requests_month: number;
  requests_last_month: number;
}

const getFromCache = <T>(key: string, duration: number): T | null => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const parsed: CachedData<T> = JSON.parse(item);
    const now = Date.now();

    if (now - parsed.timestamp > duration) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch (e) {
    console.error("Error reading from cache", e);
    return null;
  }
};

const setCache = <T>(key: string, data: T) => {
  try {
    const cacheItem: CachedData<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (e) {
    console.error("Error writing to cache", e);
  }
};

export const fetchGoldData = async (forceRefresh = false): Promise<GoldData | null> => {
  const apiKey = await getAppConfig(CONFIG_KEYS.GOLD_API_KEY);
  if (!apiKey) {
    console.warn("Gold API key is missing");
    return null;
  }

  if (!forceRefresh) {
    const cached = getFromCache<GoldData>(CACHE_KEYS.GOLD, CACHE_DURATION.GOLD);
    if (cached) return cached;
  }

  try {
    const response = await fetch(`https://www.goldapi.io/api/XAU/INR`, {
      headers: {
        "x-access-token": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
        let errorMsg = `API Error: ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData && errorData.error) {
                errorMsg = errorData.error;
            }
        } catch (e) {
            // Fallback to status text if JSON parsing fails
        }
        throw new Error(errorMsg);
    }

    const data = await response.json();
    
    // data.price is usually per ounce? No, GoldAPI XAU/INR usually returns price per ounce or gram depending on endpoint?
    // Checking docs: XAU is 1 troy ounce. 1 troy ounce = 31.1034768 grams.
    // Wait, let's check the response format.
    // Usually it returns 'price' which is for 1 ounce.
    // Let's assume price is per Ounce and convert.
    // Actually, GoldAPI has price_gram_24k, price_gram_22k etc in the response usually?
    // Let's check standard response. 
    // Standard response: { price: ..., currency: ..., price_gram_24k: ..., price_gram_22k: ... }
    
    // If the API doesn't return gram prices directly, we calculate.
    // But GoldAPI usually does.
    
    const INDIAN_PREMIUM_MULTIPLIER = 1.054;
    const pricePerOunce = data.price * INDIAN_PREMIUM_MULTIPLIER;
    const pricePerGram24k = (data.price_gram_24k ? data.price_gram_24k * INDIAN_PREMIUM_MULTIPLIER : undefined) || (pricePerOunce / 31.1034768);
    const pricePerGram22k = (data.price_gram_22k ? data.price_gram_22k * INDIAN_PREMIUM_MULTIPLIER : undefined) || (pricePerGram24k * 0.9167);
    const pricePerGram21k = (data.price_gram_21k ? data.price_gram_21k * INDIAN_PREMIUM_MULTIPLIER : undefined) || (pricePerGram24k * 0.875);
    const pricePerGram18k = (data.price_gram_18k ? data.price_gram_18k * INDIAN_PREMIUM_MULTIPLIER : undefined) || (pricePerGram24k * 0.750);

    const result: GoldData = {
      price_gram_24k: pricePerGram24k,
      price_gram_22k: pricePerGram22k,
      price_gram_21k: pricePerGram21k,
      price_gram_18k: pricePerGram18k,
      currency: data.currency,
      timestamp: data.timestamp < 1000000000000 ? data.timestamp * 1000 : data.timestamp,
    };

    setCache(CACHE_KEYS.GOLD, result);
    return result;
  } catch (error) {
    logError("Error fetching Gold data", { error });
    throw error; // Propagate error to UI
  }
};

export const fetchSilverData = async (forceRefresh = false): Promise<SilverData | null> => {
  const apiKey = await getAppConfig(CONFIG_KEYS.GOLD_API_KEY);
  if (!apiKey) {
    return null;
  }

  if (!forceRefresh) {
    const cached = getFromCache<SilverData>(CACHE_KEYS.SILVER, CACHE_DURATION.SILVER);
    if (cached) return cached;
  }

  try {
    const response = await fetch(`https://www.goldapi.io/api/XAG/INR`, {
      headers: {
        "x-access-token": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
        let errorMsg = `API Error: ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData && errorData.error) {
                errorMsg = errorData.error;
            }
        } catch (e) {
            // Fallback to status text if JSON parsing fails
        }
        throw new Error(errorMsg);
    }

    const data = await response.json();
    
    // Silver (XAG)
    const INDIAN_PREMIUM_MULTIPLIER = 1.054;
    const pricePerOunce = data.price * INDIAN_PREMIUM_MULTIPLIER;
    const pricePerGram24k = (data.price_gram_24k ? data.price_gram_24k * INDIAN_PREMIUM_MULTIPLIER : undefined) || (pricePerOunce / 31.1034768);

    const result: SilverData = {
      price_gram_24k: pricePerGram24k,
      currency: data.currency,
      timestamp: data.timestamp < 1000000000000 ? data.timestamp * 1000 : data.timestamp,
    };

    setCache(CACHE_KEYS.SILVER, result);
    return result;
  } catch (error) {
    logError("Error fetching Silver data", { error });
    throw error; // Propagate error to UI
  }
};

export const fetchGoldApiStats = async (): Promise<GoldApiStats | null> => {
    const apiKey = await getAppConfig(CONFIG_KEYS.GOLD_API_KEY);
    if (!apiKey) return null;

    try {
        const response = await fetch("https://www.goldapi.io/api/stat", {
            headers: {
                "x-access-token": apiKey,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) return null;

        return await response.json();
    } catch (e) {
        console.error("Failed to fetch Gold API stats", e);
        return null;
    }
};
