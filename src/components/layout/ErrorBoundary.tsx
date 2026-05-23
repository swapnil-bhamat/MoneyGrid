import React from "react";
import { Container, Alert, Button } from "react-bootstrap";
import { logError } from "@/services/logger";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError("Error caught by boundary:", {error, errorInfo});
  }

  handleReset = () => {
    localStorage.removeItem("dbVersion");
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container
          className="d-flex flex-column justify-content-center align-items-center"
          style={{ height: "100vh", textAlign: "center", padding: "2rem" }}
        >
          <Alert variant="danger" className="w-100 mb-3">
            <h4>Something went wrong</h4>
            <div>
              {this.state.error?.message || "An unexpected error occurred"}
            </div>
          </Alert>
          <Button variant="outline-primary" onClick={this.handleReset}>
            Reset Database and Reload
          </Button>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
