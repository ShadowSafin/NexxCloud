"use client";

import { useId, useState } from "react";
import { FolderItem, useFileStore } from "@/store/fileStore";
import { useToastStore } from "@/store/toastStore";
import { cn, formatDate } from "@/lib/utils";
import { Pencil, Trash2, MoreVertical, RotateCcw } from "lucide-react";
import { RenameDialog } from "./rename-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ContextMenu, useContextMenu, ContextMenuItem } from "@/components/ui/context-menu";

interface FolderCardProps {
  folder: FolderItem;
  viewMode: "grid" | "list";
  onNavigate: (folderId: string) => void;
  isTrashView?: boolean;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  isDropTarget?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onRemoved?: (id: string) => void;
  onRestored?: (id: string) => void;
}

function ThemedFolderIcon({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const gradientId = useId().replace(/:/g, "");

  return (
    <div
      className={cn(
        "relative shrink-0 transition-transform duration-300 ease-out",
        compact ? "h-6 w-7" : "h-24 w-28",
        className,
      )}
      aria-hidden="true"
    >
      {!compact && (
        <>
          <div className="absolute -inset-7 rounded-full border border-cyan-200/[0.06] bg-[radial-gradient(circle_at_50%_42%,rgba(34,211,238,0.16),rgba(124,58,237,0.08)_42%,transparent_70%)] opacity-80 blur-[1px] transition-opacity duration-500 group-hover:opacity-100" />
          <div className="absolute inset-x-4 bottom-0 h-4 rounded-full bg-cyan-400/20 blur-xl transition-all duration-500 group-hover:bg-cyan-300/30" />
        </>
      )}
      <svg
        viewBox="0 0 180 128"
        fill="none"
        className="relative h-full w-full drop-shadow-[0_16px_28px_rgba(6,182,212,0.18)] transition-[filter] duration-300 group-hover:drop-shadow-[0_20px_34px_rgba(139,92,246,0.24)]"
      >
        <defs>
          <linearGradient id={`${gradientId}-back`} x1="36" x2="142" y1="15" y2="82" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22D3EE" />
            <stop offset="0.48" stopColor="#38BDF8" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id={`${gradientId}-front`} x1="25" x2="152" y1="45" y2="124" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A5F3FC" />
            <stop offset="0.18" stopColor="#22D3EE" />
            <stop offset="0.64" stopColor="#0EA5E9" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id={`${gradientId}-shine`} x1="28" x2="122" y1="50" y2="92" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity="0.62" />
            <stop offset="0.42" stopColor="white" stopOpacity="0.16" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${gradientId}-edge`} x1="34" x2="142" y1="44" y2="112" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity="0.42" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d="M24 20C24 13.373 29.373 8 36 8H78.78C84.13 8 89.01 10.996 91.437 15.763L100.8 34.16C102.86 38.208 107.018 40.76 111.56 40.76H150C158.837 40.76 166 47.923 166 56.76V95.5C166 104.337 158.837 111.5 150 111.5H30C21.163 111.5 14 104.337 14 95.5V30C14 24.477 18.477 20 24 20Z"
          fill={`url(#${gradientId}-back)`}
        />
        <path
          d="M24 45.5C24 36.663 31.163 29.5 40 29.5H142C154.15 29.5 164 39.35 164 51.5V101C164 111.493 155.493 120 145 120H35C24.507 120 16 111.493 16 101V53.5C16 49.082 19.582 45.5 24 45.5Z"
          fill={`url(#${gradientId}-front)`}
        />
        <path
          d="M24 45.5C24 36.663 31.163 29.5 40 29.5H142C153.858 29.5 163.525 38.882 163.982 50.628C159.94 45.658 153.774 42.5 146.86 42.5H42C31.507 42.5 23 51.007 23 61.5V101C23 108.913 27.84 115.694 34.72 118.548C24.334 118.397 16 109.969 16 99.548V53.5C16 49.082 19.582 45.5 24 45.5Z"
          fill={`url(#${gradientId}-shine)`}
        />
        <path
          d="M25 46.5C25 38.216 31.716 31.5 40 31.5H142C153.046 31.5 162 40.454 162 51.5V100.5C162 110.165 154.165 118 144.5 118H35.5C25.835 118 18 110.165 18 100.5V53.5C18 49.634 21.134 46.5 25 46.5Z"
          stroke={`url(#${gradientId}-edge)`}
          strokeWidth="2"
        />
        <path
          d="M38 38H141C150.389 38 158 45.611 158 55"
          stroke="white"
          strokeOpacity="0.22"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function FolderCard({
  folder, viewMode, onNavigate,
  isTrashView, isSelected, isDropTarget,
  onDragOver, onDragLeave, onDrop,
  onRemoved, onRestored,
}: FolderCardProps) {
  const store = useFileStore();
  const { trashFolder, restoreFolder, permanentDeleteFolder, toggleSelect, selectedIds } = store;
  const { addToast } = useToastStore();
  const { menu: contextMenu, open: openContextMenu, close: closeContextMenu } = useContextMenu();

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPermanent, setConfirmPermanent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const isSelectedFinal = isSelected ?? selectedIds.has(folder.id);

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      await trashFolder(folder.id);
      setConfirmDelete(false);
      onRemoved?.(folder.id);
      addToast(`"${folder.name}" moved to trash`, "success");
    } catch {
      addToast("Failed to trash folder", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    setIsProcessing(true);
    try {
      await restoreFolder(folder.id);
      onRestored?.(folder.id);
      addToast(`"${folder.name}" restored`, "success");
    } catch {
      addToast("Failed to restore folder", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePermanentDelete = async () => {
    setIsProcessing(true);
    try {
      await permanentDeleteFolder(folder.id);
      setConfirmPermanent(false);
      onRemoved?.(folder.id);
      addToast(`"${folder.name}" permanently deleted`, "success");
    } catch {
      addToast("Failed to delete folder", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const getContextMenuItems = (): ContextMenuItem[] => {
    if (isTrashView) {
      return [
        { label: "Restore", icon: <RotateCcw className="w-4 h-4" />, onClick: handleRestore },
        { divider: true, label: "", onClick: () => {} },
        { label: "Delete Forever", icon: <Trash2 className="w-4 h-4" />, onClick: () => setConfirmPermanent(true), destructive: true },
      ];
    }

    return [
      { label: "Open", icon: <ThemedFolderIcon compact className="h-4 w-5" />, shortcut: "Enter", onClick: () => onNavigate(folder.id) },
      { divider: true, label: "", onClick: () => {} },
      { label: "Rename", icon: <Pencil className="w-4 h-4" />, shortcut: "F2", onClick: () => setIsRenameOpen(true) },
      { divider: true, label: "", onClick: () => {} },
      { label: "Move to Trash", icon: <Trash2 className="w-4 h-4" />, shortcut: "Del", onClick: () => setConfirmDelete(true), destructive: true },
    ];
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(e, getContextMenuItems());
  };

  const handleClick = (e: React.MouseEvent) => {
    if (e.detail > 1) return;
    
    e.stopPropagation();
    toggleSelect(folder.id, e as any);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate(folder.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify([{ id: folder.id, type: "folder", name: folder.name }]));
  };

  // List view
  if (viewMode === "list") {
    return (
      <div
        data-file-card
        className={cn(
          "group flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/[0.05] glass-card glass-card-hover cursor-pointer select-none",
          isDropTarget ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.2)]" : isSelectedFinal ? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "",
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        draggable
        onDragStart={handleDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <ThemedFolderIcon compact className="group-hover:scale-110" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/90 group-hover:text-white truncate">{folder.name}</p>
        </div>
        <p className="text-xs text-white/40 font-mono shrink-0 w-28 text-right hidden md:block">{formatDate(folder.createdAt)}</p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {isTrashView ? (
            <>
              <button onClick={(e) => { e.stopPropagation(); handleRestore(); }} className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all" title="Restore">
                <RotateCcw className="w-3.5 h-3.5 text-white/60 hover:text-white" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setConfirmPermanent(true); }} className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-red-500/20 hover:border-red-500/30 transition-all" title="Delete Forever">
                <Trash2 className="w-3.5 h-3.5 text-white/60 hover:text-red-400" />
              </button>
            </>
          ) : (
            <>
              <button onClick={(e) => { e.stopPropagation(); setIsRenameOpen(true); }} className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all" title="Rename">
                <Pencil className="w-3.5 h-3.5 text-white/60 hover:text-white" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }} className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-red-500/20 hover:border-red-500/30 transition-all" title="Move to Trash">
                <Trash2 className="w-3.5 h-3.5 text-white/60 hover:text-red-400" />
              </button>
            </>
          )}
        </div>

        <RenameDialog open={isRenameOpen} onOpenChange={setIsRenameOpen} itemId={folder.id} itemName={folder.name} itemType="folder" />
        <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Move to Trash" description={`"${folder.name}" and all its contents will be moved to trash.`} confirmLabel="Move to Trash" variant="destructive" onConfirm={handleDelete} loading={isProcessing} />
        <ConfirmDialog open={confirmPermanent} onOpenChange={setConfirmPermanent} title="Delete Permanently" description={`"${folder.name}" and all its contents will be permanently deleted. This cannot be undone.`} confirmLabel="Delete Forever" variant="destructive" onConfirm={handlePermanentDelete} loading={isProcessing} />
        {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={closeContextMenu} />}
      </div>
    );
  }

  // Grid view
  return (
    <div
      data-file-card
      className={cn(
        "group relative rounded-xl border border-white/[0.05] glass-card glass-card-hover cursor-pointer select-none h-full flex flex-col justify-between overflow-hidden",
        isDropTarget ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.25)]" : isSelectedFinal ? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.2)]" : "",
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      draggable
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* 3-dot menu */}
      <button
        onClick={(e) => { e.stopPropagation(); handleContextMenu(e as any); }}
        className="absolute top-2 right-2 z-10 p-1 rounded-md bg-white/[0.03] border border-white/[0.05] opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] hover:border-white/[0.15] transition-all"
      >
        <MoreVertical className="w-3.5 h-3.5 text-white/60" />
      </button>

      {/* Folder Icon with ambient glow container */}
      <div className="flex-1 flex items-center justify-center p-3 min-h-0 relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-purple-500/5 to-transparent blur-2xl opacity-40 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <ThemedFolderIcon className="group-hover:scale-105" />
      </div>

      {/* Info Section */}
      <div className="px-3 pb-2.5 pt-1.5 shrink-0 bg-black/10 border-t border-white/[0.02]">
        <p className="text-xs font-semibold text-white/90 group-hover:text-white truncate mb-0.5">{folder.name}</p>
        <p className="text-[10px] text-white/40 font-mono">{formatDate(folder.createdAt)}</p>
      </div>

      <RenameDialog open={isRenameOpen} onOpenChange={setIsRenameOpen} itemId={folder.id} itemName={folder.name} itemType="folder" />
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Move to Trash" description={`"${folder.name}" and all its contents will be moved to trash.`} confirmLabel="Move to Trash" variant="destructive" onConfirm={handleDelete} loading={isProcessing} />
      <ConfirmDialog open={confirmPermanent} onOpenChange={setConfirmPermanent} title="Delete Permanently" description={`"${folder.name}" and all its contents will be permanently deleted. This cannot be undone.`} confirmLabel="Delete Forever" variant="destructive" onConfirm={handlePermanentDelete} loading={isProcessing} />
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={closeContextMenu} />}
    </div>
  );
}
