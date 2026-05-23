import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { logError, logInfo } from "@/shared/services/logger";

interface BioLockContextType {
  isLocked: boolean;
  isEnabled: boolean;
  isSupported: boolean;
  hasPinFallback: boolean;
  register: () => Promise<boolean>;
  authenticate: () => Promise<boolean>;
  disable: () => void;
  lock: () => void;
  setPinFallback: (pin: string) => Promise<boolean>;
  authenticateWithPin: (pin: string) => Promise<boolean>;
  removePinFallback: () => void;
}

const BioLockContext = createContext<BioLockContextType | null>(null);

export const useBioLock = () => {
  const context = useContext(BioLockContext);
  if (!context) {
    throw new Error("useBioLock must be used within a BioLockProvider");
  }
  return context;
};

const STORAGE_KEY_ENABLED = "bio_auth_enabled";
const STORAGE_KEY_CREDENTIAL_ID = "bio_auth_credential_id";
const STORAGE_KEY_PIN_HASH = "bio_auth_pin_hash";

export const BioLockProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isLocked, setIsLocked] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [hasPinFallback, setHasPinFallback] = useState(false);

  useEffect(() => {
    // Check if WebAuthn is supported
    if (
      window.PublicKeyCredential &&
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
    ) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(
        (available) => {
          setIsSupported(available);
        }
      );
    }

    // Check if previously enabled
    const enabled = localStorage.getItem(STORAGE_KEY_ENABLED) === "true";
    const credentialId = localStorage.getItem(STORAGE_KEY_CREDENTIAL_ID);
    const pinHash = localStorage.getItem(STORAGE_KEY_PIN_HASH);

    if (enabled && credentialId) {
      setIsEnabled(true);
      setIsLocked(true); // Lock by default if enabled
    }
    setHasPinFallback(!!pinHash);
  }, []);

  const register = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "Personal Finance PWA",
          id: window.location.hostname,
        },
        user: {
          id: Uint8Array.from("user_id", (c) => c.charCodeAt(0)),
          name: "user@example.com",
          displayName: "User",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      };

      const credential = (await navigator.credentials.create({
        publicKey,
      })) as PublicKeyCredential;

      if (credential) {
        // Save the credential ID (base64url encoded)
        // For simplicity in this local-only demo, we just flag it as enabled.
        // In a real app, we'd store the ID to verify against it later,
        // but for "unlocking", just proving presence/verification is often enough for local data.
        // However, to be proper, let's store the ID.
        
        // Simple ArrayBuffer to Base64 helper
        const rawId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        
        localStorage.setItem(STORAGE_KEY_CREDENTIAL_ID, rawId);
        localStorage.setItem(STORAGE_KEY_ENABLED, "true");
        setIsEnabled(true);
        logInfo("Biometric registration successful");
        return true;
      }
    } catch (error) {
      logError("Biometric registration failed", { error });
    }
    return false;
  }, [isSupported]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isEnabled) return true;

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const storedId = localStorage.getItem(STORAGE_KEY_CREDENTIAL_ID);
      
      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId: window.location.hostname,
        userVerification: "required",
      };

      if (storedId) {
        try {
          // Decode the base64 string back to original byte array
          const binaryString = atob(storedId);
          const idArray = Uint8Array.from(binaryString, c => c.charCodeAt(0));
          
          publicKey.allowCredentials = [{
            id: idArray,
            type: "public-key",
            transports: ["internal"],
          }];
          
          logInfo("Authenticating with options:", { 
            hasStoredId: true, 
            credentialIdLength: idArray.length,
            transports: ["internal"] 
          });
        } catch (e) {
          logError("Failed to decode stored credential ID", { error: e });
        }
      } else {
        logInfo("No stored credential ID found during authenticate");
      }

      const assertion = await navigator.credentials.get({ publicKey });

      if (assertion) {
        setIsLocked(false);
        return true;
      }
    } catch (error) {
      // Check if it's an AbortError or NotAllowedError which might happen if user cancels
      logError("Biometric authentication failed", { error });
    }
    return false;
  }, [isEnabled]);

  const disable = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_ENABLED);
    localStorage.removeItem(STORAGE_KEY_CREDENTIAL_ID);
    localStorage.removeItem(STORAGE_KEY_PIN_HASH);
    setIsEnabled(false);
    setIsLocked(false);
    setHasPinFallback(false);
  }, []);

  const lock = useCallback(() => {
    if (isEnabled) {
      setIsLocked(true);
    }
  }, [isEnabled]);

  const setPinFallback = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const hash = await hashPin(pin);
      localStorage.setItem(STORAGE_KEY_PIN_HASH, hash);
      setHasPinFallback(true);
      return true;
    } catch (err) {
      logError("Failed to set PIN fallback", { error: err });
      return false;
    }
  }, []);

  const authenticateWithPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const storedHash = localStorage.getItem(STORAGE_KEY_PIN_HASH);
      if (!storedHash) return false;
      const inputHash = await hashPin(pin);
      if (storedHash === inputHash) {
        setIsLocked(false);
        return true;
      }
    } catch (err) {
      logError("PIN validation failed", { error: err });
    }
    return false;
  }, []);

  const removePinFallback = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_PIN_HASH);
    setHasPinFallback(false);
  }, []);

  return (
    <BioLockContext.Provider
      value={{
        isLocked,
        isEnabled,
        isSupported,
        hasPinFallback,
        register,
        authenticate,
        disable,
        lock,
        setPinFallback,
        authenticateWithPin,
        removePinFallback,
      }}
    >
      {children}
    </BioLockContext.Provider>
  );
};

// SHA-256 secure local hash helper utilizing standard Web Crypto API
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
