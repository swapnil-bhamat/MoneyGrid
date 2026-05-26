"use client";
import React, { useState } from "react";
import { Button, Spinner, Toast, ToastContainer } from "react-bootstrap";
import { FaGoogleDrive, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { useAuth } from "@/hooks/useAuth";
import { syncToDrive } from "@/services/driveSync";
import { logError, logInfo } from "@/services/logger";

type SyncStatus = "idle" | "syncing" | "success" | "error";

const DriveSyncButton: React.FC = () => {
  const { user, authState, handleSignIn } = useAuth();
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const handleAction = async () => {
    if (authState === "checking" || status === "syncing") return;

    if (authState !== "signedIn" || !user) {
      logInfo("User clicked sync while signed out. Triggering Google Drive sign-in.");
      try {
        await handleSignIn();
        setToastMsg("✅ Successfully connected to Google Drive and synced!");
        setShowToast(true);
      } catch (error) {
        logError("Auth failed from sync button click:", { error });
        const errMsg = error instanceof Error ? error.message : String(error);
        setToastMsg(`❌ Failed to connect to Google Drive: ${errMsg}`);
        setShowToast(true);
      }
      return;
    }

    // Signed in: Perform sync
    setStatus("syncing");
    try {
      await syncToDrive();
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2500);
      setToastMsg("✅ Successfully synced local data to Google Drive");
    } catch (error) {
      logError("Manual sync failed: " + String(error));
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
      setToastMsg("❌ Failed to sync to Google Drive");
    } finally {
      setShowToast(true);
    }
  };

  const getButtonVariant = () => {
    if (status === "syncing" || authState === "checking") return "outline-info";
    if (status === "success") return "success";
    if (status === "error") return "danger";
    if (authState === "signedIn") return "outline-success";
    return "outline-secondary";
  };

  const getButtonTitle = () => {
    if (authState === "checking") return "Checking Google Drive connection...";
    if (status === "syncing") return "Syncing with Google Drive...";
    if (authState === "signedIn") {
      return `Sync to Google Drive (Connected as ${user?.displayName || "User"})`;
    }
    return "Connect Google Drive & Sync Local Data";
  };

  return (
    <>
      <Button
        variant={getButtonVariant()}
        onClick={handleAction}
        disabled={status === "syncing" || authState === "checking"}
        title={getButtonTitle()}
        className="d-flex align-items-center justify-content-center gap-2 px-3 position-relative"
        style={{ transition: "all 0.3s ease", minWidth: "40px" }}
      >
        {status === "syncing" || authState === "checking" ? (
          <>
            <Spinner animation="border" size="sm" className="me-1" />
            <span className="d-none d-md-inline small">
              {authState === "checking" ? "Connecting..." : "Syncing..."}
            </span>
          </>
        ) : status === "success" ? (
          <>
            <FaCheckCircle className="fs-6" />
            <span className="d-none d-md-inline small fw-medium">Synced</span>
          </>
        ) : status === "error" ? (
          <>
            <FaExclamationCircle className="fs-6" />
            <span className="d-none d-md-inline small fw-medium">Failed</span>
          </>
        ) : (
          <>
            <FaGoogleDrive className={`fs-5 ${authState === "signedIn" ? "text-success" : "text-muted"}`} />
            <span className="d-none d-md-inline small fw-medium">
              {authState === "signedIn" ? "Cloud Sync" : "Backup Setup"}
            </span>
            {authState !== "signedIn" && (
              <span 
                className="position-absolute top-0 start-100 translate-middle p-1 bg-warning border border-light rounded-circle" 
                style={{ width: "8px", height: "8px" }}
                title="Not connected to Cloud Sync"
              />
            )}
          </>
        )}
      </Button>

      <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast
          bg={
            status === "success" || (authState === "signedIn" && toastMsg.includes("Successfully connected"))
              ? "success"
              : status === "error" || toastMsg.includes("Failed")
              ? "danger"
              : "secondary"
          }
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={4000}
          autohide
        >
          <Toast.Body className="text-white fw-medium">{toastMsg}</Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default DriveSyncButton;
