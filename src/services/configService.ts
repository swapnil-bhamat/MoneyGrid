import { db } from "@/infrastructure/db/db";
import { logError } from "@/services/logger";
import { encrypt, decrypt, getPassphrase } from "@/utils/encryption";

export const CONFIG_KEYS = {
  GEMINI_API_KEY: "GEMINI_API_KEY",
  GEMINI_MODEL: "GEMINI_MODEL",
  GOLD_API_KEY: "GOLD_API_KEY",
  GOLD_API_QUOTA: "GOLD_API_QUOTA", // Legacy, can be reused or ignored? Keeping for now.
  GOLD_API_CITY: "GOLD_API_CITY",
  GOLD_API_DAILY_LIMIT: "GOLD_API_DAILY_LIMIT",
  GOLD_API_MONTHLY_LIMIT: "GOLD_API_MONTHLY_LIMIT",
  CHAT_PERMISSIONS: "CHAT_PERMISSIONS",
  FIRE_PLAN_MARKDOWN: "FIRE_PLAN_MARKDOWN",
};

const SENSITIVE_KEYS = [CONFIG_KEYS.GEMINI_API_KEY, CONFIG_KEYS.GOLD_API_KEY];

export const getAppConfig = async (key: string): Promise<string | null> => {
  try {
    const config = await db.configs.filter((c) => c.key === key).first();
    if (!config || typeof config.value !== "string") {
      return null;
    }

    // Attempt decryption if the key is sensitive and stored as ciphertext
    if (SENSITIVE_KEYS.includes(key) && config.value.startsWith("ENC:")) {
      try {
        const passphrase = getPassphrase();
        return await decrypt(config.value, passphrase);
      } catch (err) {
        console.error(`Failed to decrypt sensitive config for ${key}`, err);
        return null;
      }
    }

    return config.value;
  } catch (error) {
    console.error(`Failed to get config for ${key}`, error);
    return null;
  }
};

export const saveAppConfig = async (
  key: string,
  value: string,
): Promise<void> => {
  try {
    let valueToSave = value;
    if (SENSITIVE_KEYS.includes(key) && value) {
      const passphrase = getPassphrase();
      valueToSave = await encrypt(value, passphrase);
    }

    const existing = await db.configs.filter((c) => c.key === key).first();
    if (existing) {
      await db.configs.update(existing.id, { value: valueToSave });
    } else {
      await db.configs.add({ key, value: valueToSave } as any);
    }
  } catch (error) {
    logError(`Failed to save config for ${key}`, { error });
    throw error;
  }
};
