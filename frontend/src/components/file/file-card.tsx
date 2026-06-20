"use client";

import { useState, useRef, useEffect } from "react";
import { FileItem, useFileStore } from "@/store/fileStore";
import { useClipboardStore } from "@/store/clipboardStore";
import { useToastStore } from "@/store/toastStore";
import { cn, formatFileSize, formatDate } from "@/lib/utils";
import { getFileTypeInfo } from "@/lib/fileTypes";
import { filesApi, mediaApi } from "@/lib/api";
import {
  Download, Trash2, Pencil, MoreVertical, FileText, Share2, Star,
  RotateCcw, X, FolderInput, Copy, History, Link, Scissors, ClipboardPaste,
  CopyPlus,
} from "lucide-react";
import { RenameDialog } from "./rename-dialog";
import { ShareDialog } from "./share-dialog";
import { MoveDialog } from "./move-dialog";
import { CopyDialog } from "./copy-dialog";
import { VersionModal } from "./version-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ContextMenu, useContextMenu, ContextMenuItem } from "@/components/ui/context-menu";

interface FileCardProps {
  file: FileItem;
  viewMode: "grid" | "list";
  onPreview?: () => void;
  isTrashView?: boolean;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onRemoved?: (id: string) => void;
  onRestored?: (id: string) => void;
}

export function FileCard({
  file, viewMode, onPreview, isTrashView,
  isSelected: isSelectedProp, onSelect, onContextMenu: onContextMenuProp,
  draggable, onDragStart, onRemoved, onRestored,
}: FileCardProps) {
  const store = useFileStore();
  const { downloadFile, trashFile, restoreFile, permanentDeleteFile, selectedIds, toggleSelect, duplicateFile } = store;
  const { copy: clipboardCopy, cut: clipboardCut } = useClipboardStore();
  const { addToast } = useToastStore();
  const { menu: contextMenu, open: openContextMenu, close: closeContextMenu } = useContextMenu();

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(file.isFavorite || false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPermanent, setConfirmPermanent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fileTypeInfo = getFileTypeInfo(file.category);
  const Icon = fileTypeInfo.icon;
  const isSelected = isSelectedProp ?? selectedIds.has(file.id);

  useEffect(() => {
    let cancelled = false;
    if (!(file.thumbnailSmall || file.thumbnail)) {
      setThumbnailUrl(null);
      return;
    }
    mediaApi.sign(file.id, "thumbnail", "small")
      .then((res) => {
        if (!cancelled) setThumbnailUrl(res.data.data.url);
      })
      .catch(() => {
        if (!cancelled) setThumbnailUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [file.id, file.thumbnailSmall, file.thumbnail]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await filesApi.toggleFavorite(file.id);
      setIsFavorite(!isFavorite);
      addToast(isFavorite ? "Removed from favorites" : "Added to favorites", "info");
    } catch {}
  };

  const handleTrash = async () => {
    setIsProcessing(true);
    try {
      await trashFile(file.id);
      setConfirmDelete(false);
      onRemoved?.(file.id);
      addToast(`"${file.originalName}" moved to trash`, "success");
    } catch {
      addToast("Failed to trash file", "error");
    }
    setIsProcessing(false);
  };

  const handlePermanentDelete = async () => {
    setIsProcessing(true);
    try {
      await permanentDeleteFile(file.id);
      setConfirmPermanent(false);
      onRemoved?.(file.id);
      addToast(`"${file.originalName}" permanently deleted`, "success");
    } catch {
      addToast("Failed to delete file", "error");
    }
    setIsProcessing(false);
  };

  const handleRestore = async () => {
    setIsProcessing(true);
    try {
      await restoreFile(file.id);
      onRestored?.(file.id);
      addToast(`"${file.originalName}" restored`, "success");
    } catch {
      addToast("Failed to restore file", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      await duplicateFile(file.id);
      addToast(`"${file.originalName}" duplicated`, "success");
    } catch {
      addToast("Failed to duplicate file", "error");
    }
  };

  const handleCopyToClipboard = () => {
    clipboardCopy([{ id: file.id, type: "file", name: file.originalName }], file.folderId);
    addToast(`"${file.originalName}" copied`, "info");
  };

  const handleCutToClipboard = () => {
    clipboardCut([{ id: file.id, type: "file", name: file.originalName }], file.folderId);
    addToast(`"${file.originalName}" cut`, "info");
  };

  const handleDownload = () => {
    downloadFile(file.id, file.originalName);
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
      { label: "Preview", icon: <FileText className="w-4 h-4" />, shortcut: "Space", onClick: () => onPreview?.() },
      { label: "Download", icon: <Download className="w-4 h-4" />, shortcut: "mod+S", onClick: handleDownload },
      { divider: true, label: "", onClick: () => {} },
      { label: "Copy", icon: <Copy className="w-4 h-4" />, shortcut: "mod+C", onClick: handleCopyToClipboard },
      { label: "Cut", icon: <Scissors className="w-4 h-4" />, shortcut: "mod+X", onClick: handleCutToClipboard },
      { label: "Duplicate", icon: <CopyPlus className="w-4 h-4" />, shortcut: "mod+D", onClick: handleDuplicate },
      { divider: true, label: "", onClick: () => {} },
      { label: "Rename", icon: <Pencil className="w-4 h-4" />, shortcut: "F2", onClick: () => setIsRenameOpen(true) },
      { label: "Move to", icon: <FolderInput className="w-4 h-4" />, onClick: () => setIsMoveOpen(true) },
      { label: "Copy to", icon: <Copy className="w-4 h-4" />, onClick: () => setIsCopyOpen(true) },
      { divider: true, label: "", onClick: () => {} },
      { label: "Share", icon: <Share2 className="w-4 h-4" />, onClick: () => setIsShareOpen(true) },
      { label: isFavorite ? "Unfavorite" : "Favorite", icon: <Star className={cn("w-4 h-4", isFavorite && "fill-yellow-400 text-yellow-400")} />, onClick: () => toggleFavorite(new MouseEvent("click") as any) },
      { label: "Version History", icon: <History className="w-4 h-4" />, onClick: () => setIsVersionOpen(true) },
      { divider: true, label: "", onClick: () => {} },
      { label: "Move to Trash", icon: <Trash2 className="w-4 h-4" />, shortcut: "Del", onClick: () => setConfirmDelete(true), destructive: true },
    ];
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenuProp) {
      onContextMenuProp(e);
    } else {
      openContextMenu(e, getContextMenuItems());
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (e.detail > 1) return;
    
    e.stopPropagation();
    toggleSelect(file.id, e as any);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPreview?.();
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(e);
    } else {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("application/json", JSON.stringify([{ id: file.id, type: "file", name: file.originalName }]));
    }
  };

  // Grid view
  if (viewMode === "grid") {
    const getCategoryColor = (cat: string) => {
      switch (cat?.toLowerCase()) {
        case "images": return { text: "text-purple-400", glow: "glow-purple", iconBg: "bg-purple-500/5", border: "hover:border-purple-500/30" };
        case "videos": return { text: "text-blue-400", glow: "glow-blue", iconBg: "bg-blue-500/5", border: "hover:border-blue-500/30" };
        case "audio": return { text: "text-pink-400", glow: "glow-magenta", iconBg: "bg-pink-500/5", border: "hover:border-pink-500/30" };
        case "documents": return { text: "text-emerald-400", glow: "glow-cyan", iconBg: "bg-emerald-500/5", border: "hover:border-emerald-500/30" };
        default: return { text: "text-cyan-400", glow: "glow-cyan", iconBg: "bg-cyan-500/5", border: "hover:border-cyan-500/30" };
      }
    };
    const catColor = getCategoryColor(file.category);

    return (
      <div
        data-file-card
        className={cn(
          "group relative rounded-xl border border-white/[0.05] glass-card glass-card-hover cursor-pointer select-none h-full flex flex-col justify-between overflow-hidden",
          isSelected ? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.2)]" : "",
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        draggable={draggable}
        onDragStart={handleDragStart}
      >
        {/* Checkbox */}
        <div className="absolute top-2 left-2 z-10">
          <div
            className={cn(
              "w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-150",
              isSelected ? "bg-cyan-500 border-cyan-400" : "border-white/30 bg-black/40 opacity-0 group-hover:opacity-100",
            )}
          >
            {isSelected && (
              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>

        {/* Favorite star */}
        <button onClick={toggleFavorite} className="absolute top-2.5 right-8 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <Star className={cn("w-3.5 h-3.5", isFavorite ? "fill-yellow-400 text-yellow-400 opacity-100 animate-pulse" : "text-white/40 hover:text-white")} />
        </button>

        {/* 3-dot menu */}
        <button
          onClick={(e) => { e.stopPropagation(); handleContextMenu(e); }}
          className="absolute top-2 right-2 z-10 p-1 rounded-md bg-white/[0.03] border border-white/[0.05] opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] hover:border-white/[0.15] transition-all"
        >
          <MoreVertical className="w-3.5 h-3.5 text-white/60" />
        </button>

        {/* Thumbnail or Icon Container */}
        <div className="flex-1 relative m-2.5 min-h-0 rounded-lg overflow-hidden bg-black/25 border border-white/[0.03] flex items-center justify-center">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={file.originalName}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className={cn("w-full h-full flex items-center justify-center transition-all duration-300 relative", catColor.iconBg)}>
              <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] to-transparent pointer-events-none" />
              <Icon className={cn("w-8 h-8 transition-transform duration-300 group-hover:scale-110", catColor.text, catColor.glow)} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-3 pb-2.5 pt-1.5 shrink-0 bg-black/10 border-t border-white/[0.02]">
          <p className="text-xs font-semibold text-white/90 group-hover:text-white truncate mb-0.5" title={file.originalName}>{file.originalName}</p>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-white/40 font-mono">{formatFileSize(file.size)}</p>
            {(file as any).refCount > 1 && (
              <span className="flex items-center gap-0.5 text-xs text-cyan-400 glow-cyan" title={`Shared with ${(file as any).refCount - 1} other(s)`}>
                <Link className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <RenameDialog open={isRenameOpen} onOpenChange={setIsRenameOpen} itemId={file.id} itemName={file.originalName} itemType="file" />
        <ShareDialog fileId={file.id} fileName={file.originalName} open={isShareOpen} onOpenChange={setIsShareOpen} />
        <MoveDialog fileId={file.id} fileName={file.originalName} open={isMoveOpen} onOpenChange={setIsMoveOpen} onMoved={() => {}} />
        <CopyDialog fileId={file.id} fileName={file.originalName} isOpen={isCopyOpen} onClose={() => setIsCopyOpen(false)} />
        <VersionModal fileId={file.id} fileName={file.originalName} isOpen={isVersionOpen} onClose={() => setIsVersionOpen(false)} />
        <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Move to Trash" description={`"${file.originalName}" will be moved to trash.`} confirmLabel="Move to Trash" variant="destructive" onConfirm={handleTrash} loading={isProcessing} />
        <ConfirmDialog open={confirmPermanent} onOpenChange={setConfirmPermanent} title="Delete Permanently" description={`"${file.originalName}" will be permanently deleted. This cannot be undone.`} confirmLabel="Delete Forever" variant="destructive" onConfirm={handlePermanentDelete} loading={isProcessing} />

        {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={closeContextMenu} />}
      </div>
    );
  }

  // List view
  const getCategoryColor = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case "images": return { text: "text-purple-400", glow: "glow-purple" };
      case "videos": return { text: "text-blue-400", glow: "glow-blue" };
      case "audio": return { text: "text-pink-400", glow: "glow-magenta" };
      case "documents": return { text: "text-emerald-400", glow: "glow-cyan" };
      default: return { text: "text-cyan-400", glow: "glow-cyan" };
    }
  };
  const catColor = getCategoryColor(file.category);

  return (
    <div
      data-file-card
      className={cn(
        "group flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/[0.05] glass-card glass-card-hover cursor-pointer select-none",
        isSelected ? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "",
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      draggable={draggable}
      onDragStart={handleDragStart}
    >
      {/* Checkbox */}
      <div
        className={cn(
          "w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all duration-150",
          isSelected ? "bg-cyan-50 border-cyan-400" : "border-white/30 bg-black/40 opacity-0 group-hover:opacity-100",
        )}
      >
        {isSelected && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Thumbnail */}
      <div className="w-8 h-8 flex items-center justify-center shrink-0 overflow-hidden rounded-lg bg-black/20 border border-white/[0.04]">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={file.originalName} className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
        ) : (
          <Icon className={cn("w-4.5 h-4.5 transition-transform group-hover:scale-110", catColor.text, catColor.glow)} />
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90 group-hover:text-white truncate">{file.originalName}</p>
      </div>

      {/* Size */}
      <p className="text-xs text-white/40 font-mono shrink-0 w-20 text-right">{formatFileSize(file.size)}</p>

      {/* Date */}
      <p className="text-xs text-white/40 font-mono shrink-0 w-28 text-right hidden md:block">{formatDate(file.createdAt)}</p>

      {/* Actions */}
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
            <button onClick={(e) => { e.stopPropagation(); toggleFavorite(e); }} className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all" title="Favorite">
              <Star className={cn("w-3.5 h-3.5", isFavorite ? "fill-yellow-400 text-yellow-400" : "text-white/60 hover:text-white")} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleDownload(); }} className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all" title="Download">
              <Download className="w-3.5 h-3.5 text-white/60 hover:text-white" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIsShareOpen(true); }} className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all" title="Share">
              <Share2 className="w-3.5 h-3.5 text-white/60 hover:text-white" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIsRenameOpen(true); }} className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all" title="Rename">
              <Pencil className="w-3.5 h-3.5 text-white/60 hover:text-white" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIsMoveOpen(true); }} className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all" title="Move to">
              <FolderInput className="w-3.5 h-3.5 text-white/60 hover:text-white" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }} className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-red-500/20 hover:border-red-500/30 transition-all" title="Move to Trash">
              <Trash2 className="w-3.5 h-3.5 text-white/60 hover:text-red-400" />
            </button>
          </>
        )}
      </div>

      {/* Dialogs */}
      <RenameDialog open={isRenameOpen} onOpenChange={setIsRenameOpen} itemId={file.id} itemName={file.originalName} itemType="file" />
      <ShareDialog fileId={file.id} fileName={file.originalName} open={isShareOpen} onOpenChange={setIsShareOpen} />
      <MoveDialog fileId={file.id} fileName={file.originalName} open={isMoveOpen} onOpenChange={setIsMoveOpen} onMoved={() => {}} />
      <CopyDialog fileId={file.id} fileName={file.originalName} isOpen={isCopyOpen} onClose={() => setIsCopyOpen(false)} />
      <VersionModal fileId={file.id} fileName={file.originalName} isOpen={isVersionOpen} onClose={() => setIsVersionOpen(false)} />
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Move to Trash" description={`"${file.originalName}" will be moved to trash.`} confirmLabel="Move to Trash" variant="destructive" onConfirm={handleTrash} loading={isProcessing} />
      <ConfirmDialog open={confirmPermanent} onOpenChange={setConfirmPermanent} title="Delete Permanently" description={`"${file.originalName}" will be permanently deleted. This cannot be undone.`} confirmLabel="Delete Forever" variant="destructive" onConfirm={handlePermanentDelete} loading={isProcessing} />

      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={closeContextMenu} />}
    </div>
  );
}
