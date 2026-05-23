import React from "react";
import { Button, ButtonGroup } from "react-bootstrap";
import { FaUndo, FaRedo } from "react-icons/fa";
import { useUndoRedo } from "@/hooks/useUndoRedo";

const UndoRedoControls: React.FC = () => {
  const { canUndo, canRedo, undo, redo } = useUndoRedo();

  if (!canUndo && !canRedo) return null;

  return (
    <ButtonGroup size="sm" className="me-2">
      <Button
        variant="outline-secondary"
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        <FaUndo />
      </Button>
      <Button
        variant="outline-secondary"
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        aria-label="Redo"
      >
        <FaRedo />
      </Button>
    </ButtonGroup>
  );
};

export default UndoRedoControls;
