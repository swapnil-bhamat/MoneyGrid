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
        }
      } catch (error) {
        logError("Session restoration failed:", { error });
        setAuthState("signedOut");
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

      // Try to restore from Drive, if not found use local data
      const restored = await initializeFromDrive(true);
      if (!restored) {
        // If no data in Drive, initialize with local data
        await initializeFromDrive(false);
      }
      setupDriveSync(false);
      setAuthState("signedIn");
    } catch (error) {
      logError("Google sign-in failed:", { error });
      setAuthState("error");
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
