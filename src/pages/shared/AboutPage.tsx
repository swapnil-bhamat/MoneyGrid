import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import { Container } from "react-bootstrap";
import readmeContent from "../../../README.md?raw";

const MarkdownPage: React.FC = () => {
  const [content] = useState<string>(readmeContent);
  const [currentTheme, setCurrentTheme] = useState<string>(
    document.body.getAttribute("data-bs-theme") || "light"
  );

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-bs-theme"
        ) {
          const newTheme =
            document.body.getAttribute("data-bs-theme") || "light";
          setCurrentTheme(newTheme);
        }
      });
    });

    observer.observe(document.body, { attributes: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (content) {
      mermaid.initialize({
        startOnLoad: true,
        theme: currentTheme === "dark" ? "dark" : "default",
        securityLevel: "loose",
      });
      mermaid.contentLoaded();
    }
  }, [content, currentTheme]);

  return (
    <Container fluid className="flex-grow-1 overflow-auto" key={currentTheme}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className || "");

            if (match?.[1] === "mermaid") {
              return (
                <div className="mermaid">
                  {String(children).replace(/\n$/, "")}
                </div>
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
    </Container>
  );
};

export default MarkdownPage;
