"use client";

import { useState, useEffect } from "react";
import { versionsApi } from "@/lib/api";
import { formatFileSize, formatDate } from "@/lib/utils";
import { X, RotateCcw, Trash2, History, Loader2 } from "lucide-react";

interface Version {
  id: string;
  version: number;
  size: string;
  hash: string | null;
  createdAt: string;
}

interface VersionModalProps {
  fileId: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function VersionModal({ fileId, fileName, isOpen, onClose }: VersionModalProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    versionsApi
      .list(fileId)
      .then((res) => setVersions(res.data.data))
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [fileId, isOpen]);

  const handleRestore = async (versionNumber: number) => {
    setRestoring(versionNumber);
    try {
      await versionsApi.restore(fileId, versionNumber);
      // Refresh versions list
      const res = await versionsApi.list(fileId);
      setVersions(res.data.data);
    } catch (err) {
      console.error("Restore failed:", err);
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (versionNumber: number) => {
    setDeleting(versionNumber);
    try {
      await versionsApi.delete(fileId, versionNumber);
      setVersions((prev) => prev.filter((v) => v.version !== versionNumber));
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 bg-canvas-card border border-hairline rounded-sm w-full max-w-md max-h-[80vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-body-mid" />
            <span className="text-sm text-ink">Version History</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-sm hover:bg-canvas-mid transition-colors">
            <X className="w-4 h-4 text-body-mid" />
          </button>
        </div>

        {/* File name */}
        <div className="px-5 py-3 border-b border-hairline shrink-0">
          <p className="text-xs text-body-mid truncate">{fileName}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-body-mid animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <History className="w-8 h-8 text-canvas-mid" />
              <p className="text-sm text-body-mid">No versions yet</p>
              <p className="text-xs text-mute">Versions are created when files are updated</p>
            </div>
          ) : (
            <div className="px-5 py-3 space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center gap-3 p-3 rounded-sm bg-canvas-soft border border-hairline"
                >
                  {/* Version number */}
                  <div className="w-8 h-8 rounded-full bg-canvas-mid flex items-center justify-center shrink-0">
                    <span className="text-xs text-ink font-mono">v{version.version}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-ink">Version {version.version}</span>
                      <span className="text-xs text-mute font-mono">
                        {formatFileSize(Number(version.size))}
                      </span>
                    </div>
                    <p className="text-xs text-body-mid mt-0.5">{formatDate(version.createdAt)}</p>
                    {version.hash && (
                      <p className="text-xs text-mute font-mono mt-0.5 truncate">
                        {version.hash.slice(0, 16)}...
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleRestore(version.version)}
                      disabled={restoring === version.version}
                      className="p-1.5 rounded-sm hover:bg-canvas-mid transition-colors"
                      title="Restore this version"
                    >
                      {restoring === version.version ? (
                        <Loader2 className="w-3.5 h-3.5 text-body-mid animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5 text-body-mid" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(version.version)}
                      disabled={deleting === version.version}
                      className="p-1.5 rounded-sm hover:bg-canvas-mid transition-colors"
                      title="Delete this version"
                    >
                      {deleting === version.version ? (
                        <Loader2 className="w-3.5 h-3.5 text-body-mid animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5 text-body-mid hover:text-destructive" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-4 border-t border-hairline shrink-0">
          <button className="btn-pill text-xs h-9" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
