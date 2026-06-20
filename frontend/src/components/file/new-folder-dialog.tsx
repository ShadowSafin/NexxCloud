"use client";

import { useState } from "react";
import { useFileStore } from "@/store/fileStore";
import { FolderPlus } from "lucide-react";

interface NewFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: string | null;
}

export function NewFolderDialog({ open, onOpenChange, parentId }: NewFolderDialogProps) {
  const { createFolder } = useFileStore();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      await createFolder(name.trim(), parentId);
      setName("");
      onOpenChange(false);
    } catch (error) {
      console.error("Create folder failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => onOpenChange(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 bg-canvas-card border border-hairline rounded-sm w-full max-w-sm animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-5 py-4 border-b border-hairline">
          <FolderPlus className="w-4 h-4 text-body-mid" />
          <span className="text-sm text-ink">New Folder</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4">
            <input
              type="text"
              placeholder="Folder name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-xai text-sm"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-hairline">
            <button type="button" className="btn-pill text-xs h-9" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</button>
            <button type="submit" className="btn-pill-primary text-xs h-9" disabled={!name.trim() || isLoading}>
              {isLoading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
