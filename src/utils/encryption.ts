const ENCRYPTION_PREFIX = "ENC:";

// Helper to convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Derive a stable AES-256 key from a passphrase and static salt using PBKDF2
async function deriveKey(passphrase: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function getPassphrase(): string {
  const bioEnabled = localStorage.getItem("bio_auth_enabled") === "true";
  const bioCredId = localStorage.getItem("bio_auth_credential_id");
  
  if (bioEnabled && bioCredId) {
    return bioCredId;
  }
  
  let deviceKey = localStorage.getItem("device_encryption_key");
  if (!deviceKey) {
    // Generate a cryptographically secure random UUID as device key
    deviceKey = window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2);
    localStorage.setItem("device_encryption_key", deviceKey);
  }
  return deviceKey;
}

export async function encrypt(text: string, passphrase: string): Promise<string> {
  const salt = "finance_pwa_crypto_salt";
  const key = await deriveKey(passphrase, salt);
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encoder.encode(text)
  );

  const ivBase64 = arrayBufferToBase64(iv.buffer);
  const encryptedBase64 = arrayBufferToBase64(encrypted);
  
  return `${ENCRYPTION_PREFIX}${ivBase64}:${encryptedBase64}`;
}

export async function decrypt(encryptedText: string, passphrase: string): Promise<string> {
  if (!encryptedText.startsWith(ENCRYPTION_PREFIX)) {
    return encryptedText;
  }

  const parts = encryptedText.substring(ENCRYPTION_PREFIX.length).split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted format");
  }

  const [ivBase64, ciphertextBase64] = parts;
  const salt = "finance_pwa_crypto_salt";
  const key = await deriveKey(passphrase, salt);

  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const ciphertext = base64ToArrayBuffer(ciphertextBase64);

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
