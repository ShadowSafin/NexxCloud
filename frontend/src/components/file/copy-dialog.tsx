"use client";

import { useState, useEffect } from "react";
import { foldersApi, filesApi } from "@/lib/api";
import { X, Folder, ChevronRight, Copy, Loader2 } from "lucide-react";

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  children?: FolderNode[];
}

interface CopyDialogProps {
  fileId: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
  onCopied?: () => void;
}

export function CopyDialog({ fileId, fileName, isOpen, onClose, onCopied }: CopyDialogProps) {
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    foldersApi
      .tree()
      .then((res) => setTree(res.data.data))
      .catch(() => setTree([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleCopy = async () => {
    setCopying(true);
    try {
      await filesApi.copy(fileId, selectedFolder);
      onCopied?.();
      onClose();
    } catch (err) {
      console.error("Copy failed:", err);
    } finally {
      setCopying(false);
    }
  };

  const renderTree = (nodes: FolderNode[], depth: number = 0) => {
    return nodes.map((node) => (
      <div key={node.id}>
        <button
          onClick={() => setSelectedFolder(node.id)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-left transition-colors ${
            selectedFolder === node.id
              ? "bg-accent-sunset/10 border border-accent-sunset/30"
              : "hover:bg-canvas-soft border border-transparent"
          }`}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          <Folder className="w-3.5 h-3.5 text-body-mid shrink-0" />
          <span className="text-sm text-ink truncate">{node.name}</span>
        </button>
        {node.children && node.children.length > 0 && renderTree(node.children, depth + 1)}
      </div>
    ));
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
            <Copy className="w-4 h-4 text-body-mid" />
            <span className="text-sm text-ink">Copy To</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-sm hover:bg-canvas-mid transition-colors">
            <X className="w-4 h-4 text-body-mid" />
          </button>
        </div>

        {/* File name */}
        <div className="px-5 py-3 border-b border-hairline shrink-0">
          <p className="text-xs text-body-mid truncate">{fileName}</p>
        </div>

        {/* Folder tree */}
        <div className="flex-1 overflow-y-auto min-h-0 px-2 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-body-mid animate-spin" />
            </div>
          ) : (
            <>
              {/* Root option */}
              <button
                onClick={() => setSelectedFolder(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-left transition-colors ${
                  selectedFolder === null
                    ? "bg-accent-sunset/10 border border-accent-sunset/30"
                    : "hover:bg-canvas-soft border border-transparent"
                }`}
              >
                <Folder className="w-3.5 h-3.5 text-body-mid shrink-0" />
                <span className="text-sm text-ink">Root (My Files)</span>
              </button>
              {renderTree(tree)}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-hairline shrink-0">
          <button className="btn-pill text-xs h-9" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-pill-primary text-xs h-9 flex items-center gap-1.5"
            onClick={handleCopy}
            disabled={copying}
          >
            {copying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copying ? "Copying..." : "Copy Here"}
          </button>
        </div>
      </div>
    </div>
  );
}
