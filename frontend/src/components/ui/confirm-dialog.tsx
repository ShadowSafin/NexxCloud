"use client";

import { AlertTriangle } from "lucide-react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => onOpenChange(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 bg-canvas-card border border-hairline rounded-sm w-full max-w-sm animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 text-center">
          {variant === "destructive" && (
            <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
          )}
          <h3 className="text-lg text-ink mb-2">{title}</h3>
          <p className="text-sm text-body-mid">{description}</p>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button className="btn-pill flex-1 h-10" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className={`flex-1 h-10 rounded-pill text-sm font-normal transition-all ${
              variant === "destructive"
                ? "bg-destructive text-white hover:bg-destructive/90 border border-destructive"
                : "btn-pill-primary"
            }`}
            onClick={() => { onConfirm(); }}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
