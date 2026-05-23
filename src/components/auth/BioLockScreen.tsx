import React, { useEffect, useState, useRef } from "react";
import { Container, Button, Card, Form, Alert } from "react-bootstrap";
import { useBioLock } from "@/contexts/bioLockContext";
import { FaLock, FaKey, FaChevronLeft } from "react-icons/fa";

const BioLockScreen: React.FC = () => {
  const { authenticate, isLocked, hasPinFallback, authenticateWithPin } = useBioLock();
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Programmatic keyboard focus triggers for mobile/PWA environments
  useEffect(() => {
    if (usePin) {
      pinInputRef.current?.focus();
      const timer = setTimeout(() => {
        pinInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [usePin]);

  // Clear states when screen unlocks
  useEffect(() => {
    if (!isLocked) {
      setPin("");
      setError("");
      setUsePin(false);
      setIsVerifying(false);
    }
  }, [isLocked]);

  if (!isLocked) return null;

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4 || pin.length > 8) {
      setError("PIN must be between 4 and 8 digits.");
      return;
    }

    setError("");
    setIsVerifying(true);

    const success = await authenticateWithPin(pin);
    setIsVerifying(false);

    if (!success) {
      setError("Invalid PIN. Please try again.");
      setPin("");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(var(--bs-body-bg-rgb), 0.96)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <Container style={{ maxWidth: "400px" }}>
        <Card className="text-center shadow-lg glass-card text-body">
          <Card.Body className="py-5 px-4">
            {!usePin ? (
              <>
                <div className="mb-4">
                  <FaLock size={64} className="text-primary animate-pulse" />
                </div>
                <h2 className="mb-3 fw-bold">App Locked</h2>
                <p className="text-body-secondary mb-4">
                  Authentication is required to access your financial data.
                </p>
                <div className="d-flex flex-column gap-2">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-100 rounded-pill py-2 fs-6 fw-medium"
                    onClick={() => authenticate()}
                  >
                    Unlock with Biometrics
                  </Button>
                  
                  {hasPinFallback && (
                    <Button
                      variant="outline-secondary"
                      size="lg"
                      className="w-100 rounded-pill py-2 fs-6 fw-medium border-secondary"
                      onClick={() => setUsePin(true)}
                    >
                      <FaKey className="me-2" size={14} />
                      Unlock with PIN
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <Form onSubmit={handlePinSubmit}>
                <div className="text-start mb-3">
                  <Button
                    variant="link"
                    className="text-body p-0 d-flex align-items-center gap-1 text-decoration-none small opacity-75"
                    onClick={() => {
                      setUsePin(false);
                      setPin("");
                      setError("");
                    }}
                  >
                    <FaChevronLeft size={10} />
                    Back
                  </Button>
                </div>
                
                <div className="mb-4">
                  <FaKey size={56} className="text-warning" />
                </div>
                <h3 className="mb-2 fw-bold">Enter Fallback PIN</h3>
                <p className="text-body-secondary small mb-4">
                  Please enter your 4 to 8 digit local backup PIN code.
                </p>

                {error && (
                  <Alert variant="danger" className="py-2 px-3 mb-3 small text-start">
                    ⚠️ {error}
                  </Alert>
                )}

                <Form.Group className="mb-4">
                  <Form.Control
                    ref={pinInputRef}
                    type="password"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="••••••"
                    className="text-center fs-2 py-2 rounded-3"
                    value={pin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 8) {
                        setPin(val);
                      }
                    }}
                    disabled={isVerifying}
                    style={{
                      letterSpacing: "0.4em",
                      backgroundColor: "rgba(var(--bs-body-color-rgb), 0.08)",
                      color: "var(--bs-body-color)",
                      borderColor: "var(--bs-border-color)",
                    }}
                  />
                </Form.Group>

                <Button
                  variant="warning"
                  type="submit"
                  size="lg"
                  className="w-100 rounded-pill py-2 fw-semibold fs-6"
                  disabled={isVerifying || pin.length < 4}
                >
                  {isVerifying ? "Verifying..." : "Verify PIN"}
                </Button>
              </Form>
            )}
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default BioLockScreen;
