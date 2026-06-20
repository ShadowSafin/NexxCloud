"use client";

import { useToastStore } from "@/store/toastStore";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: "text-green-400",
  error: "text-destructive",
  info: "text-accent-sunset",
  warning: "text-yellow-400",
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-canvas-card border border-hairline rounded-sm shadow-lg animate-slide-up min-w-[280px] max-w-[400px]"
          >
            <Icon className={`w-4 h-4 shrink-0 ${colors[toast.type]}`} />
            <span className="text-sm text-ink flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-0.5 rounded-sm hover:bg-canvas-mid transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5 text-body-mid" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
