// src/components/DebugConsole.tsx
import React, { useState } from "react";
import { Container, Card, Button, Collapse } from "react-bootstrap";
import { getLogs, clearLogs, LogEntry } from "@/services/logger";
import { MdDeleteSweep, MdWarning, MdDangerous } from "react-icons/md";
import { BsArrowRepeat, BsInfoCircle } from "react-icons/bs";

function CollapsibleCode({ jsonData }: { jsonData: LogEntry["metadata"] }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="mb-3">
      <Card.Header>
        <Button
          variant="link"
          onClick={() => setOpen(!open)}
          aria-controls="code-block"
          aria-expanded={open}
        >
          {open ? "Hide Metadata" : "Show Metadata"}
        </Button>
      </Card.Header>

      <Collapse in={open}>
        <div id="code-block">
          <Card.Body>
            <pre className="mb-0">
              <code>{JSON.stringify(jsonData, null, 2)}</code>
            </pre>
          </Card.Body>
        </div>
      </Collapse>
    </Card>
  );
}

const DebugConsole: React.FC = () => {
  const [logs, setLogs] = useState(getLogs());

  const refreshLogs = () => setLogs([...getLogs()]);
  const handleClear = () => {
    clearLogs();
    setLogs([]);
  };

  return (
    <Container fluid className="flex-grow-1 overflow-auto">
      <Card className="mb-4">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <strong>Logs</strong>
            <div className="d-flex gap-2">
              <Button size="sm" variant="secondary" onClick={refreshLogs}>
                <BsArrowRepeat />
              </Button>
              <Button size="sm" variant="danger" onClick={handleClear}>
                <MdDeleteSweep />
              </Button>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          <div
            className="p-2 rounded"
            style={{
              maxHeight: "300px",
              overflowY: "auto",
              fontSize: "0.85rem",
            }}
          >
            {logs.length === 0 && <div>No logs yet</div>}
            {logs.map((log, idx) => (
              <div key={idx}>
                <span className="text-body-secondary">[{log.timestamp}]</span>
                <br />
                <strong
                  className={`text-${
                    log.level === "error"
                      ? "danger"
                      : log.level === "warn"
                      ? "warning"
                      : "info"
                  }`}
                >
                  {(log.level === "error" && <MdDangerous />) ||
                    (log.level === "warn" && <MdWarning />) || <BsInfoCircle />}
                </strong>{" "}
                <i>{String(log.message)}</i>
                <br />
                {log.metadata && <CollapsibleCode jsonData={log.metadata} />}
                <hr />
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DebugConsole;
