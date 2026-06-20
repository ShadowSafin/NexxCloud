"use client";

import { useUploadStore } from "@/store/uploadStore";
import { formatFileSize } from "@/lib/utils";
import {
  X,
  Pause,
  Play,
  XCircle,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Upload,
  Minimize2,
} from "lucide-react";
import { useState } from "react";

export function UploadQueuePanel() {
  const {
    uploads,
    isVisible,
    setVisible,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    removeUpload,
    clearCompleted,
  } = useUploadStore();

  const [minimized, setMinimized] = useState(false);

  if (!isVisible || uploads.length === 0) return null;

  const activeUploads = uploads.filter(
    (u) => u.status === "uploading" || u.status === "merging" || u.status === "paused"
  );
  const completedUploads = uploads.filter((u) => u.status === "completed");
  const failedUploads = uploads.filter((u) => u.status === "failed");

  const totalProgress =
    uploads.length > 0
      ? uploads.reduce((sum, u) => sum + u.progress, 0) / uploads.length
      : 0;
  const hasActive = activeUploads.length > 0;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2 animate-fade-in">
      {/* Main Panel */}
      <div
        className="w-80 flex flex-col rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_30px_80px_rgba(0,0,0,0.8)] transition-all duration-300"
        style={{
          background: "rgba(6, 4, 16, 0.85)",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            {/* Animated upload icon */}
            <div className="relative w-7 h-7 flex items-center justify-center">
              {hasActive ? (
                <>
                  {/* Spinning ring */}
                  <svg
                    className="absolute inset-0 w-full h-full -rotate-90"
                    viewBox="0 0 28 28"
                  >
                    <circle
                      cx="14"
                      cy="14"
                      r="11"
                      fill="none"
                      stroke="rgba(6,182,212,0.12)"
                      strokeWidth="2"
                    />
                    <circle
                      cx="14"
                      cy="14"
                      r="11"
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 11}
                      strokeDashoffset={2 * Math.PI * 11 * (1 - totalProgress)}
                      className="transition-all duration-300"
                      style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,0.6))" }}
                    />
                  </svg>
                  <Upload className="w-3 h-3 text-cyan-400 relative z-10" />
                </>
              ) : failedUploads.length > 0 ? (
                <AlertCircle className="w-5 h-5 text-red-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" style={{ filter: "drop-shadow(0 0 6px rgba(52,211,153,0.5))" }} />
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-white leading-tight">
                {hasActive
                  ? `Uploading ${activeUploads.length} file${activeUploads.length !== 1 ? "s" : ""}`
                  : failedUploads.length > 0
                  ? `${failedUploads.length} failed`
                  : "Upload complete"}
              </p>
              {hasActive && (
                <p className="text-[10px] text-white/35 font-mono leading-tight">
                  {Math.round(totalProgress * 100)}% overall
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {completedUploads.length > 0 && (
              <button
                onClick={clearCompleted}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-all"
                title="Clear completed"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setMinimized(!minimized)}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-all"
              title={minimized ? "Expand" : "Minimize"}
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setVisible(false)}
              className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/[0.08] transition-all"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Upload List ── */}
        {!minimized && (
          <div className="flex-1 overflow-y-auto max-h-[300px] divide-y divide-white/[0.04]">
            {uploads.map((upload) => {
              const progressPct = Math.round(upload.progress * 100);
              return (
                <div key={upload.id} className="px-4 py-3 group hover:bg-white/[0.02] transition-colors">
                  {/* File name + status icon */}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-white/80 truncate flex-1 mr-2 leading-tight">
                      {upload.filename}
                    </p>
                    <StatusIcon status={upload.status} />
                  </div>

                  {/* Progress bar */}
                  {(upload.status === "uploading" || upload.status === "merging") && (
                    <div className="mb-1.5">
                      {/* Track */}
                      <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${progressPct}%`,
                            background:
                              upload.status === "merging"
                                ? "linear-gradient(90deg, #818cf8, #c084fc)"
                                : "linear-gradient(90deg, #22d3ee, #818cf8)",
                            boxShadow:
                              upload.status === "merging"
                                ? "0 0 8px rgba(192,132,252,0.6)"
                                : "0 0 8px rgba(34,211,238,0.6)",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Chunk dots for large uploads */}
                  {upload.status === "uploading" && upload.totalChunks > 1 && (
                    <div className="flex flex-wrap gap-[2px] mb-2">
                      {Array.from({ length: Math.min(upload.totalChunks, 40) }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 h-1 rounded-full transition-colors ${
                            upload.uploadedChunks.has(i)
                              ? "bg-cyan-400"
                              : upload.failedChunks.has(i)
                              ? "bg-red-400"
                              : "bg-white/[0.08]"
                          }`}
                        />
                      ))}
                      {upload.totalChunks > 40 && (
                        <span className="text-[9px] text-white/25 ml-0.5 font-mono">+{upload.totalChunks - 40}</span>
                      )}
                    </div>
                  )}

                  {/* Meta info + action buttons */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/30 font-mono leading-tight">
                      {upload.status === "uploading" &&
                        `${progressPct}% · ${formatFileSize(upload.speed)}/s`}
                      {upload.status === "merging" && "Merging…"}
                      {upload.status === "completed" && formatFileSize(upload.totalSize)}
                      {upload.status === "failed" && (upload.error || "Upload failed")}
                      {upload.status === "paused" && "Paused"}
                      {upload.status === "cancelled" && "Cancelled"}
                    </span>

                    <div className="flex items-center gap-0.5">
                      {upload.status === "uploading" && (
                        <ActionButton
                          onClick={() => pauseUpload(upload.id)}
                          title="Pause"
                          icon={<Pause className="w-3 h-3" />}
                        />
                      )}
                      {upload.status === "paused" && (
                        <ActionButton
                          onClick={() => resumeUpload(upload.id)}
                          title="Resume"
                          icon={<Play className="w-3 h-3" />}
                        />
                      )}
                      {(upload.status === "uploading" || upload.status === "paused") && (
                        <ActionButton
                          onClick={() => cancelUpload(upload.id)}
                          title="Cancel"
                          icon={<XCircle className="w-3 h-3" />}
                          destructive
                        />
                      )}
                      {upload.status === "failed" && (
                        <ActionButton
                          onClick={() => retryUpload(upload.id)}
                          title="Retry"
                          icon={<RotateCcw className="w-3 h-3" />}
                        />
                      )}
                      {(upload.status === "completed" || upload.status === "cancelled") && (
                        <ActionButton
                          onClick={() => removeUpload(upload.id)}
                          title="Remove"
                          icon={<X className="w-3 h-3" />}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Minimized total bar ── */}
        {minimized && hasActive && (
          <div className="px-4 py-3">
            <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round(totalProgress * 100)}%`,
                  background: "linear-gradient(90deg, #22d3ee, #818cf8)",
                  boxShadow: "0 0 8px rgba(34,211,238,0.5)",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  title,
  icon,
  destructive = false,
}: {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={[
        "p-1 rounded-md transition-all",
        destructive
          ? "text-white/30 hover:text-red-400 hover:bg-red-500/[0.08]"
          : "text-white/30 hover:text-white/80 hover:bg-white/[0.05]",
      ].join(" ")}
    >
      {icon}
    </button>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "uploading":
      return (
        <Loader2
          className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0"
          style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,0.5))" }}
        />
      );
    case "merging":
      return (
        <Loader2
          className="w-3.5 h-3.5 text-purple-400 animate-spin shrink-0"
          style={{ filter: "drop-shadow(0 0 4px rgba(192,132,252,0.5))" }}
        />
      );
    case "completed":
      return (
        <CheckCircle2
          className="w-3.5 h-3.5 text-emerald-400 shrink-0"
          style={{ filter: "drop-shadow(0 0 4px rgba(52,211,153,0.5))" }}
        />
      );
    case "failed":
      return <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
    case "paused":
      return <Pause className="w-3.5 h-3.5 text-white/40 shrink-0" />;
    default:
      return null;
  }
}
