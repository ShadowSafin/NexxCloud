"use client";

import { useState, useEffect } from "react";
import { foldersApi, filesApiMove } from "@/lib/api";
import { Folder, FolderOpen, HardDrive, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  children?: FolderNode[];
}

interface MoveDialogProps {
  fileId: string;
  fileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoved?: () => void;
}

export function MoveDialog({ fileId, fileName, open, onOpenChange, onMoved }: MoveDialogProps) {
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (open) loadFolderTree();
  }, [open]);

  const loadFolderTree = async () => {
    setLoading(true);
    try {
      const res = await foldersApi.tree();
      setFolderTree(res.data.data || []);
    } catch {
      setFolderTree([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async () => {
    setMoving(true);
    try {
      await filesApiMove(fileId, selectedFolderId);
      onOpenChange(false);
      onMoved?.();
    } catch (err) {
      console.error("Move failed:", err);
    } finally {
      setMoving(false);
    }
  };

  const renderFolder = (folder: FolderNode, depth: number = 0) => {
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id}>
        <button
          className={cn(
            "flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-sm transition-colors",
            isSelected ? "bg-canvas-soft text-ink" : "text-body hover:text-ink hover:bg-canvas-soft/50"
          )}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => setSelectedFolderId(folder.id)}
        >
          {hasChildren ? <FolderOpen className="w-3.5 h-3.5 shrink-0" /> : <Folder className="w-3.5 h-3.5 shrink-0" />}
          <span className="truncate">{folder.name}</span>
        </button>
        {hasChildren && folder.children!.map((child) => renderFolder(child, depth + 1))}
      </div>
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => onOpenChange(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 bg-canvas-card border border-hairline rounded-sm w-full max-w-sm animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <span className="text-sm text-ink truncate max-w-[200px]">Move "{fileName}"</span>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded-sm hover:bg-canvas-mid transition-colors">
            <X className="w-4 h-4 text-body-mid" />
          </button>
        </div>

        <div className="max-h-[300px] overflow-y-auto p-3">
          {loading ? (
            <div className="text-center text-xs text-body-mid py-8">Loading folders...</div>
          ) : (
            <>
              <button
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-sm transition-colors",
                  selectedFolderId === null ? "bg-canvas-soft text-ink" : "text-body hover:text-ink hover:bg-canvas-soft/50"
                )}
                onClick={() => setSelectedFolderId(null)}
              >
                <HardDrive className="w-3.5 h-3.5" />
                Root
              </button>
              {folderTree.map((folder) => renderFolder(folder))}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-hairline">
          <button className="btn-pill text-xs h-9" onClick={() => onOpenChange(false)}>Cancel</button>
          <button className="btn-pill-primary text-xs h-9" onClick={handleMove} disabled={moving}>
            {moving ? "Moving..." : "Move Here"}
          </button>
        </div>
      </div>
    </div>
  );
}
