import { useState, useEffect } from "react";
import { Card, Button, Badge } from "react-bootstrap";
import { getDailyTip, Tip } from "@/data/financialTips";
import { FaLightbulb, FaCopy, FaCheck } from "react-icons/fa";

export default function DailyTipCard() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setTip(getDailyTip());
  }, []);

  const handleCopy = () => {
    if (tip) {
      navigator.clipboard.writeText(`"${tip.text}" - ${tip.author || "Financial Wisdom"}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!tip) return null;

  return (
    <Card className="h-100 border-0 shadow-sm bg-gradient-primary-to-secondary text-white" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="d-flex align-items-center gap-2">
            <FaLightbulb className="fs-4 text-warning" />
            <h5 className="mb-0 fw-bold">Daily Wisdom</h5>
          </div>
          <Badge bg="light" text="dark" className="px-3 py-2 rounded-pill">
            {tip.category}
          </Badge>
        </div>
        
        <figure className="mb-0">
          <blockquote className="blockquote mb-3">
            <p className="fs-5 lh-base">"{tip.text}"</p>
          </blockquote>
          {tip.author && (
            <figcaption className="blockquote-footer text-white-50 mb-0">
              <cite title="Source">{tip.author}</cite>
            </figcaption>
          )}
        </figure>

        <div className="d-flex justify-content-end mt-3">
          <Button 
            variant="link" 
            className="text-white p-0 text-decoration-none d-flex align-items-center gap-2 opacity-75 hover-opacity-100"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? <FaCheck /> : <FaCopy />}
            <span className="small">{copied ? "Copied!" : "Share"}</span>
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
