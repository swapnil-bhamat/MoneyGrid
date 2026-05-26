import React, {
  createContext,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {
  signInWithGoogleDrive,
  signOut,
  initializeGoogleDrive,
  findFile,
} from "@/services/googleDrive";
import {
  initializeFromDrive,
  setupDriveSync,
  stopDriveSync,
  syncToDrive,
} from "@/services/driveSync";
import { logError, logInfo } from "@/services/logger";
import { db } from "@/infrastructure/db/db";

type AuthState = "checking" | "signedIn" | "signedOut" | "error";

type User = {
  displayName: string;
  photoURL: string;
  email?: string;
};

export interface AuthContextType {
  user: User | null;
  authState: AuthState;
  handleSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

const clearDatabase = async () => {
  try {
    // Get all table names from Dexie instance
    const tableNames = db.tables.map((table) => table.name);

    // Clear all tables in a transaction
    await db.transaction("rw", tableNames, async () => {
      for (const tableName of tableNames) {
        await db.table(tableName).clear();
      }
    });

    // Remove the version flag
    localStorage.removeItem("dbVersion");

    logInfo("Database cleared successfully");
  } catch (error) {
    logError("Error clearing database:", { error });
    throw error;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authState, setAuthState] = useState<AuthState>("checking");

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        // Try to restore Google Drive session without triggering auth
        const userInfo = await initializeGoogleDrive();
        if (userInfo) {
          setUser({
            displayName: userInfo.name || "Google User",
            photoURL: userInfo.picture || "",
            email: userInfo.email,
          });
          // Initialize sync with Drive
          const restored = await initializeFromDrive(true);
          if (!restored) {
            // If no data in Drive, initialize with local data
            await initializeFromDrive(false);
          }
          setupDriveSync(false);
          setAuthState("signedIn");
        } else {
          setAuthState("signedOut");
          // If database is empty, seed it with default local data so they can use the app immediately
          let isEmpty = false;
          if (typeof window !== "undefined" && window.indexedDB) {
            try {
              const counts = await Promise.all(
                db.tables.map((table) => table.count())
              );
              isEmpty = counts.every((count) => count === 0);
            } catch (e) {
              logInfo("Could not check IndexedDB count on startup:", { error: String(e) });
            }
          }
          if (isEmpty) {
            logInfo("IndexedDB is empty, initializing default local data");
            await initializeFromDrive(false);
          }
        }
      } catch (error) {
        logError("Session restoration failed:", { error });
        setAuthState("signedOut");
        // Fallback: if database is empty, load local data anyway so app works
        const counts = await Promise.all(
          db.tables.map((table) => table.count())
        ).catch(() => []);
        if (counts.length === 0 || counts.every((count) => count === 0)) {
          await initializeFromDrive(false).catch(logError);
        }
      }
    };

    checkExistingSession();

    // Cleanup on unmount
    return () => {
      stopDriveSync();
    };
  }, []);

  const handleSignIn = useCallback(async () => {
    try {
      setAuthState("checking");
      const googleUser = await signInWithGoogleDrive();
      setUser({
        displayName: googleUser.name || "Google User",
        photoURL: googleUser.picture || "",
        email: googleUser.email,
      });

      // Check if we already have local data in IndexedDB
      let hasLocalData = false;
      if (typeof window !== "undefined" && window.indexedDB) {
        try {
          const counts = await Promise.all(
            db.tables.map((table) => table.count())
          );
          hasLocalData = counts.some((count) => count > 0);
        } catch (e) {
          logInfo("Could not check IndexedDB count on sign-in:", { error: String(e) });
        }
      }

      let restored = false;
      if (hasLocalData) {
        // If there is local data, check if a backup exists in Google Drive first
        const existingFile = await findFile("data.json").catch(() => null);
        if (existingFile) {
          const confirmRestore = window.confirm(
            "☁️ Existing Backup Found!\n\n" +
            "We found an existing database backup on your Google Drive.\n\n" +
            "• Click 'OK' to RESTORE the cloud backup (this will replace your current local data).\n" +
            "• Click 'Cancel' to KEEP your local data and upload/overwrite it to Google Drive."
          );
          if (confirmRestore) {
            restored = await initializeFromDrive(true);
          } else {
            // Overwrite Google Drive with current local data
            await syncToDrive();
            restored = false;
          }
        } else {
          // No backup in Google Drive, sync current local data to Drive
          await syncToDrive();
          restored = false;
        }
      } else {
        // Local DB is empty, restore if possible, otherwise initialize default data
        restored = await initializeFromDrive(true);
        if (!restored) {
          await initializeFromDrive(false);
        }
      }

      setupDriveSync(false);
      setAuthState("signedIn");
    } catch (error) {
      logError("Google sign-in failed:", { error });
      setAuthState("error");
      throw error;
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      setAuthState("checking");

      // Sync one last time before signing out
      await syncToDrive().catch(logError);
      stopDriveSync();

      // Clear database after ensuring data is synced
      await clearDatabase();
      await signOut();
      setUser(null);
      setAuthState("signedOut");
    } catch (error) {
      logError("Sign-out failed:", { error });
      setAuthState("error");
    }
  }, []);

  const contextValue: AuthContextType = {
    user,
    authState,
    handleSignIn,
    handleSignOut,
  };

  return React.createElement(
    AuthContext.Provider,
    { value: contextValue },
    children
  );
};
