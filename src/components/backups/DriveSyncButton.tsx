"use client";
import React, { useState } from "react";
import { Button, Spinner, Toast, ToastContainer } from "react-bootstrap";
import { FaSync, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { syncToDrive } from "@/services/driveSync";
import { logError } from "@/services/logger";

type SyncStatus = "idle" | "syncing" | "success" | "error";

const DriveSyncButton: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const handleSync = async () => {
    if (status === "syncing") return;

    setStatus("syncing");
    try {
      await syncToDrive();
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
      setToastMsg("✅ Successfully synced to Google Drive");
    } catch (error) {
      logError(String(error));
      setStatus("error");
      setToastMsg("❌ Failed to sync to Google Drive");
    } finally {
      setShowToast(true);
    }
  };

  return (
    <>
      <Button
        variant={
          status === "success"
            ? "outline-success"
            : status === "error"
            ? "outline-danger"
            : "outline-primary"
        }
        onClick={handleSync}
        disabled={status === "syncing"}
        title="Sync with Google Drive"
      >
        {status === "syncing" ? (
          <Spinner animation="border" size="sm" />
        ) : status === "success" ? (
          <FaCheckCircle />
        ) : status === "error" ? (
          <FaExclamationCircle />
        ) : (
          <FaSync />
        )}
      </Button>

      <ToastContainer position="bottom-end" className="p-3">
        <Toast
          bg={
            status === "success"
              ? "success"
              : status === "error"
              ? "danger"
              : "secondary"
          }
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={3000}
          autohide
        >
          <Toast.Body className="text-white">{toastMsg}</Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default DriveSyncButton;
