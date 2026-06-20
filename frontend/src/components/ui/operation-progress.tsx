"use client";

import { useState, useEffect } from "react";
import { create } from "zustand";
import { X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export type OperationType = "copy" | "move" | "delete" | "download";

export interface Operation {
  id: string;
  type: OperationType;
  total: number;
  completed: number;
  currentItem: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  error?: string;
}

interface OperationStore {
  operations: Operation[];
  addOperation: (operation: Omit<Operation, "id" | "status" | "completed">) => string;
  updateOperation: (id: string, updates: Partial<Operation>) => void;
  removeOperation: (id: string) => void;
  clearCompleted: () => void;
}

export const useOperationStore = create<OperationStore>((set, get) => ({
  operations: [],
  
  addOperation: (operation) => {
    const id = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      operations: [...state.operations, { ...operation, id, status: "pending", completed: 0 }],
    }));
    return id;
  },
  
  updateOperation: (id, updates) => {
    set((state) => ({
      operations: state.operations.map((op) =>
        op.id === id ? { ...op, ...updates } : op
      ),
    }));
  },
  
  removeOperation: (id) => {
    set((state) => ({
      operations: state.operations.filter((op) => op.id !== id),
    }));
  },
  
  clearCompleted: () => {
    set((state) => ({
      operations: state.operations.filter((op) => op.status !== "completed" && op.status !== "failed"),
    }));
  },
}));

export function OperationProgressModal() {
  const { operations, removeOperation, clearCompleted } = useOperationStore();
  const activeOps = operations.filter(op => op.status === "in_progress" || op.status === "pending");
  const completedOps = operations.filter(op => op.status === "completed" || op.status === "failed");
  
  if (activeOps.length === 0 && completedOps.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {/* Active operations */}
      {activeOps.map((op) => (
        <OperationItem key={op.id} operation={op} onDismiss={() => removeOperation(op.id)} />
      ))}
      
      {/* Completed operations summary */}
      {completedOps.length > 0 && (
        <div className="bg-canvas-card border border-hairline rounded-sm p-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-ink">
              {completedOps.filter(o => o.status === "completed").length} completed,{" "}
              {completedOps.filter(o => o.status === "failed").length} failed
            </p>
          </div>
          <button
            onClick={clearCompleted}
            className="text-xs text-body-mid hover:text-ink"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

function OperationItem({ operation, onDismiss }: { operation: Operation; onDismiss: () => void }) {
  const progress = operation.total > 0 ? (operation.completed / operation.total) * 100 : 0;
  
  const typeLabels = {
    copy: "Copying",
    move: "Moving",
    delete: "Deleting",
    download: "Downloading",
  };
  
  return (
    <div className="bg-canvas-card border border-hairline rounded-sm p-3 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {operation.status === "in_progress" ? (
            <Loader2 className="w-4 h-4 text-accent-sunset animate-spin" />
          ) : operation.status === "completed" ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : operation.status === "failed" ? (
            <AlertCircle className="w-4 h-4 text-destructive" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-body-mid border-t-accent-sunset animate-spin" />
          )}
          <span className="text-sm font-medium text-ink">
            {typeLabels[operation.type]}
          </span>
        </div>
        <button onClick={onDismiss} className="text-body-mid hover:text-ink">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="mb-1">
        <div className="h-1 bg-canvas-mid rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-sunset transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <p className="text-xs text-body-mid truncate flex-1 mr-2">
          {operation.currentItem}
        </p>
        <p className="text-xs text-body-mid">
          {operation.completed} / {operation.total}
        </p>
      </div>
      
      {operation.error && (
        <p className="text-xs text-destructive mt-1">{operation.error}</p>
      )}
    </div>
  );
}