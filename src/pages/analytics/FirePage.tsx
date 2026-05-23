import { type ChangeEvent, useEffect, useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import { Alert, Button, Container, Form } from "react-bootstrap";
import { useLiveQuery } from "dexie-react-hooks";
import FinancialFreedomKPI from "@/components/analytics/FinancialFreedomKPI";
import { useSharedDashboardData } from "@/contexts/DashboardDataContext";
import { CONFIG_KEYS, saveAppConfig } from "@/services/configService";
import { db } from "@/infrastructure/db/db";

function MermaidDiagram({
  chart,
  theme,
}: {
  chart: string;
  theme: string;
}) {
  const diagramRef = useRef<HTMLDivElement>(null);
  const renderId = `fire-mermaid-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    const diagram = diagramRef.current;
    let isCancelled = false;

    if (!diagram) return;

    diagram.innerHTML = "";

    mermaid.initialize({
      startOnLoad: false,
      theme: theme === "dark" ? "dark" : "default",
      securityLevel: "loose",
    });

    mermaid
      .render(renderId, chart)
      .then(({ svg, bindFunctions }) => {
        if (isCancelled || !diagramRef.current) return;

        diagramRef.current.innerHTML = svg;
        bindFunctions?.(diagramRef.current);
      })
      .catch(() => {
        if (isCancelled || !diagramRef.current) return;

        diagramRef.current.textContent = chart;
      });

    return () => {
      isCancelled = true;
      diagram.innerHTML = "";
    };
  }, [chart, renderId, theme]);

  return <div ref={diagramRef} className="mermaid-diagram" />;
}

export default function FirePage() {
  const { financialFreedomMetrics } = useSharedDashboardData();
  const firePlanConfig = useLiveQuery(
    async () =>
      (await db.configs
        .filter((config) => config.key === CONFIG_KEYS.FIRE_PLAN_MARKDOWN)
        .first()) ?? null,
    [],
    undefined
  );
  const content =
    firePlanConfig && typeof firePlanConfig.value === "string"
      ? firePlanConfig.value
      : "";
  const [currentTheme, setCurrentTheme] = useState<string>(
    document.body.getAttribute("data-bs-theme") || "light"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "danger";
    text: string;
  } | null>(null);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-bs-theme"
        ) {
          setCurrentTheme(document.body.getAttribute("data-bs-theme") || "light");
        }
      });
    });

    observer.observe(document.body, { attributes: true });

    return () => observer.disconnect();
  }, []);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setIsSaving(true);
      const markdown = await file.text();
      await saveAppConfig(CONFIG_KEYS.FIRE_PLAN_MARKDOWN, markdown);
      setMessage({
        type: "success",
        text: `${file.name} uploaded and saved as your FIRE plan.`,
      });
    } catch {
      setMessage({
        type: "danger",
        text: "Unable to upload and save the FIRE plan.",
      });
    } finally {
      setIsSaving(false);
      event.target.value = "";
    }
  };

  return (
    <Container fluid className="flex-grow-1 overflow-auto" key={currentTheme}>
      <FinancialFreedomKPI {...financialFreedomMetrics} />

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h5 className="mb-1">Upcoming FIRE Plan</h5>
          <div className="text-muted small">
            Markdown content is stored in Config as {CONFIG_KEYS.FIRE_PLAN_MARKDOWN}.
          </div>
        </div>
        <Form.Group controlId="firePlanUpload">
          <Form.Label className="mb-0">
            <Button
              as="span"
              variant="outline-primary"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Upload MD"}
            </Button>
          </Form.Label>
          <Form.Control
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            className="d-none"
            onChange={handleFileUpload}
            disabled={isSaving}
          />
        </Form.Group>
      </div>

      {message && (
        <Alert
          variant={message.type}
          dismissible
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {content ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children }) {
              const match = /language-(\w+)/.exec(className || "");

              if (match?.[1] === "mermaid") {
                return (
                  <MermaidDiagram
                    chart={String(children).replace(/\n$/, "")}
                    theme={currentTheme}
                  />
                );
              }

              return (
                <pre className={className}>
                  <code>{children}</code>
                </pre>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      ) : (
        <Alert variant="info">
          Upload a Markdown file to create your FIRE plan.
        </Alert>
      )}
    </Container>
  );
}
