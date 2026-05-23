import { useState, useEffect } from "react";
import { historyService, HistoryStatus } from "@/services/historyService";

export function useUndoRedo() {
  const [status, setStatus] = useState<HistoryStatus>(historyService.getStatus());

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = historyService.subscribe(() => {
      setStatus(historyService.getStatus());
    });

    return unsubscribe;
  }, []);

  return {
    ...status,
    undo: () => historyService.undo(),
    redo: () => historyService.redo(),
  };
}
