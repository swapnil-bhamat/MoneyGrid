import Dexie from "dexie";
import { logError, logInfo } from "@/services/logger";

const MAX_STACK_SIZE = 20;
const UNDO_STACK_KEY = "undo_stack";
const REDO_STACK_KEY = "redo_stack";

export type OperationType = "add" | "update" | "delete";

export interface HistoryOperation {
  type: OperationType;
  table: string;
  key: any;
  data?: any; // For 'put' (restore old data) or 'add' (re-add data)
}

export type HistoryGroup = HistoryOperation[];

export type HistoryMode = "normal" | "undoing" | "redoing";

export interface HistoryStatus {
  canUndo: boolean;
  canRedo: boolean;
}

class HistoryService {
  private db: Dexie | null = null;
  private mode: HistoryMode = "normal";
  private listeners: (() => void)[] = [];
  
  // Batching
  private currentBatch: HistoryGroup = [];
  private batchTimeout: any = null;

  constructor() {
    this.ensureStorage();
  }

  public setDb(db: Dexie) {
    this.db = db;
  }

  private ensureStorage() {
    if (!localStorage.getItem(UNDO_STACK_KEY)) {
      localStorage.setItem(UNDO_STACK_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(REDO_STACK_KEY)) {
      localStorage.setItem(REDO_STACK_KEY, JSON.stringify([]));
    }
  }

  private getStack(key: string): HistoryGroup[] {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  }

  public getUndoStack(): HistoryGroup[] {
    return this.getStack(UNDO_STACK_KEY);
  }

  public getRedoStack(): HistoryGroup[] {
    return this.getStack(REDO_STACK_KEY);
  }

  private saveStack(key: string, stack: HistoryGroup[]) {
    try {
      localStorage.setItem(key, JSON.stringify(stack));
      this.notifyListeners();
    } catch (error) {
      logError("Failed to save history stack", { error });
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l());
  }

  public getStatus(): HistoryStatus {
    const undoStack = this.getStack(UNDO_STACK_KEY);
    const redoStack = this.getStack(REDO_STACK_KEY);
    return {
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
    };
  }

  public clear() {
    this.saveStack(UNDO_STACK_KEY, []);
    this.saveStack(REDO_STACK_KEY, []);
    logInfo("History cleared");
  }

  // --- Tracking Logic ---

  public trackOperation(op: HistoryOperation) {
    // Determine the Inverse Operation immediately
    let inverseOp: HistoryOperation | null = null;

    switch (op.type) {
      case "add":
        // Inverse of Add is Delete
        inverseOp = { type: "delete", table: op.table, key: op.key };
        break;
      case "update":
        // Inverse of Update is Put (Old Data)
        inverseOp = { type: "update", table: op.table, key: op.key, data: op.data };
        break;
      case "delete":
        // Inverse of Delete is Add (Old Data)
        // We use 'add' type but implementation might use 'put' to enforce ID
        inverseOp = { type: "add", table: op.table, key: op.key, data: op.data };
        break;
    }

    if (inverseOp) {
      this.addToBatch(inverseOp);
    }
  }

  private addToBatch(op: HistoryOperation) {
    this.currentBatch.push(op);

    // Debounce commit
    if (this.batchTimeout) clearTimeout(this.batchTimeout);
    this.batchTimeout = setTimeout(() => {
      this.commitBatch();
    }, 50); // 50ms window to group operations (e.g. bulkAdd)
  }

  private commitBatch() {
    if (this.currentBatch.length === 0) return;

    const batch = [...this.currentBatch];
    this.currentBatch = []; // Reset

    // Processing based on Mode
    if (this.mode === "normal") {
      const undoStack = this.getStack(UNDO_STACK_KEY);
      undoStack.push(batch);
      if (undoStack.length > MAX_STACK_SIZE) undoStack.shift();
      this.saveStack(UNDO_STACK_KEY, undoStack);
      
      // Clear Redo stack on new normal action
      this.saveStack(REDO_STACK_KEY, []);
    } else if (this.mode === "undoing") {
      const redoStack = this.getStack(REDO_STACK_KEY);
      redoStack.push(batch);
      if (redoStack.length > MAX_STACK_SIZE) redoStack.shift();
      this.saveStack(REDO_STACK_KEY, redoStack);
    } else if (this.mode === "redoing") {
      const undoStack = this.getStack(UNDO_STACK_KEY);
      undoStack.push(batch);
      if (undoStack.length > MAX_STACK_SIZE) undoStack.shift();
      this.saveStack(UNDO_STACK_KEY, undoStack);
    }
  }

  // --- Execution Logic ---

  public async undo() {
    if (this.mode !== "normal") return;
    const undoStack = this.getStack(UNDO_STACK_KEY);
    const batch = undoStack.pop();
    
    if (!batch || !this.db) return;

    this.mode = "undoing";
    try {
      await this.applyBatch(batch);
      this.saveStack(UNDO_STACK_KEY, undoStack);
      logInfo("Undo successful");
    } catch (error) {
      logError("Undo failed", { error });
      // If failed, maybe push back? or just lose it.
    } finally {
      // Small delay to ensure hooks fired and batch committed before resetting mode
      // But batch commit is async (setTimeout).
      // We need to wait for the batch commit to happen?
      // Actually, applyBatch calls DB, which triggers hooks, which triggers addToBatch -> setTimeout.
      // We must wait for that timeout?
      // Better: force commit?
      // Let's rely on the timeout. We just need to stay in "undoing" mode until the batch is committed.
      // But we don't know when it's done. 
      // Workaround: We can't easily wait for the implicit hooks.
      // But we can reset mode after a safety delay.
      setTimeout(() => {
        this.mode = "normal";
      }, 100);
    }
  }

  public async redo() {
    if (this.mode !== "normal") return;
    const redoStack = this.getStack(REDO_STACK_KEY);
    const batch = redoStack.pop();

    if (!batch || !this.db) return;

    this.mode = "redoing";
    try {
      await this.applyBatch(batch);
      this.saveStack(REDO_STACK_KEY, redoStack);
      logInfo("Redo successful");
    } catch (error) {
      logError("Redo failed", { error });
    } finally {
      setTimeout(() => {
        this.mode = "normal";
      }, 100);
    }
  }

  private async applyBatch(batch: HistoryGroup) {
    if (!this.db) return;

    // Execute operations in reverse order for Undo? 
    // If I did: Add A, Add B. Undo batch = [Delete A, Delete B].
    // I should Delete B, then Delete A? Or A then B?
    // If they are independent, doesn't matter.
    // If they are related (e.g. A is parent of B), deleting A might cascade?
    // Usually, LIFO is best for Undo. 
    // The batch was collected in order of occurrence. Pushed [Op1, Op2].
    // So to Undo, we should apply [InverseOp2, InverseOp1].
    // The `trackOperation` creates the Inverse Op.
    // So the batch contains the Inverse Ops in order. 
    // Wait:
    // User Action: Add A. Hook: Add A. Track: Inverse=Delete A. Batch=[Delete A].
    // User Action: Add B. Hook: Add B. Track: Inverse=Delete B. Batch=[Delete B].
    // If User Action: Import [A, B]. Hooks: Add A, Add B.
    // Batch: [Delete A, Delete B].
    // Undo should probably execute Delete B, then Delete A. (Reverse order of creation).
    // So we should reverse the batch?
    // Yes.
    
    const ops = [...batch].reverse();
    
    await this.db.transaction('rw', this.db.tables, async () => {
        for (const op of ops) {
            const table = this.db!.table(op.table);
            if (op.type === "delete") {
                await table.delete(op.key);
            } else if (op.type === "add" || op.type === "update") {
                await table.put(op.data);
            }
        }
    });
  }
}

export const historyService = new HistoryService();
