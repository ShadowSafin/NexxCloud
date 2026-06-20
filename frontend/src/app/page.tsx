"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useFileStore, FileItem, FolderItem } from "@/store/fileStore";
import { useClipboardStore } from "@/store/clipboardStore";
import { useToastStore } from "@/store/toastStore";
import { filesApi, foldersApi, filesApiMove, filesApiCopy } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { Breadcrumb } from "@/components/file/breadcrumb";
import { FileCard } from "@/components/file/file-card";
import { FolderCard } from "@/components/file/folder-card";
import { UploadDropzone } from "@/components/file/upload-dropzone";
import { NewFolderDialog } from "@/components/file/new-folder-dialog";
import { PreviewModal } from "@/components/file/preview-modal";
import { BulkToolbar } from "@/components/file/bulk-toolbar";
import { UploadQueuePanel } from "@/components/upload/upload-queue-panel";
import { ToastContainer } from "@/components/ui/toast-container";
import { ContextMenu, useContextMenu, ContextMenuItem } from "@/components/ui/context-menu";
import { useUploadStore } from "@/store/uploadStore";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { OperationProgressModal } from "@/components/ui/operation-progress";
import {
  FileX, Upload, Clock, Star, Trash2, Copy, Scissors, ClipboardPaste,
  FolderPlus, ArrowLeft, ArrowRight, Folder, Film, FileText, Music, Image,
} from "lucide-react";
import { LandingPage } from "@/components/landing/LandingPage";
import { VirtualizedContainer } from "@/components/file/virtualized-container";
import { FileCategory } from "@/lib/fileTypes";

// ─────────────────────────────────────────────
// Category Card Definitions
// ─────────────────────────────────────────────

interface CategoryDef {
  id: string;
  label: string;
  icon: React.ElementType;
  kind: "files" | "folders";
  categories: FileCategory[];
  colorClass: string;
  glowClass: string;
  bgClass: string;
  borderHoverClass: string;
}

interface NativeUploadFilePayload {
  name: string;
  mimeType: string;
  dataUrl?: string;
  file?: File;
}

async function nativePayloadToFile(payload: NativeUploadFilePayload): Promise<File> {
  if (payload.file && typeof payload.file.arrayBuffer === "function") {
    const sourceFile = payload.file;
    return sourceFile.name
      ? sourceFile
      : new File([sourceFile], payload.name || "mobile-upload", {
          type: payload.mimeType || sourceFile.type || "application/octet-stream",
        });
  }

  if (!payload.dataUrl) {
    throw new Error("Missing native upload payload");
  }

  const response = await fetch(payload.dataUrl);
  const blob = await response.blob();
  return new File([blob], payload.name, {
    type: payload.mimeType || blob.type || "application/octet-stream",
  });
}

const CATEGORY_DEFS: CategoryDef[] = [
  {
    id: "folders",
    label: "Folders",
    icon: Folder,
    kind: "folders",
    categories: [],
    colorClass: "text-cyan-400",
    glowClass: "glow-cyan",
    bgClass: "bg-cyan-500/5",
    borderHoverClass: "hover:border-cyan-400/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]",
  },
  {
    id: "photos",
    label: "Photos",
    icon: Image,
    kind: "files",
    categories: ["images"],
    colorClass: "text-purple-400",
    glowClass: "glow-purple",
    bgClass: "bg-purple-500/5",
    borderHoverClass: "hover:border-purple-400/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]",
  },
  {
    id: "recordings",
    label: "Recordings",
    icon: Film,
    kind: "files",
    categories: ["videos"],
    colorClass: "text-blue-400",
    glowClass: "glow-blue",
    bgClass: "bg-blue-500/5",
    borderHoverClass: "hover:border-blue-400/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]",
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    kind: "files",
    categories: ["documents", "ebooks"],
    colorClass: "text-emerald-400",
    glowClass: "glow-cyan",
    bgClass: "bg-emerald-500/5",
    borderHoverClass: "hover:border-emerald-400/40 hover:shadow-[0_0_20px_rgba(52,211,153,0.2)]",
  },
  {
    id: "audio",
    label: "Audio",
    icon: Music,
    kind: "files",
    categories: ["audio"],
    colorClass: "text-pink-400",
    glowClass: "glow-magenta",
    bgClass: "bg-pink-500/5",
    borderHoverClass: "hover:border-pink-400/40 hover:shadow-[0_0_20px_rgba(236,72,153,0.2)]",
  },
];

// ─────────────────────────────────────────────
// Category Shortcut Card
// ─────────────────────────────────────────────

function CategoryCard({
  def,
  count,
  isActive,
  onClick,
}: {
  def: CategoryDef;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = def.icon;
  const countLabel = def.kind === "folders"
    ? count === 1 ? "folder" : "folders"
    : count === 1 ? "item" : "items";

  return (
    <button
      onClick={onClick}
      className={[
        "group relative flex min-w-[96px] flex-none flex-col items-center justify-center gap-2.5 rounded-2xl border p-4 text-left transition-all duration-300 cursor-pointer select-none sm:min-w-0 sm:flex-1 sm:gap-3 sm:p-5",
        "glass-card",
        def.borderHoverClass,
        isActive
          ? `border-white/20 shadow-[0_0_25px_rgba(255,255,255,0.1)] ${def.bgClass}`
          : "border-white/[0.06]",
      ].join(" ")}
    >
      {/* Active indicator glow ring */}
      {isActive && (
        <span className="absolute inset-0 rounded-2xl border border-white/20 animate-pulse pointer-events-none" />
      )}

      {/* Icon */}
      <div
        className={[
          "flex items-center justify-center w-12 h-12 rounded-xl border border-white/[0.05] transition-all duration-300 group-hover:scale-110",
          def.bgClass,
        ].join(" ")}
      >
        <Icon className={["w-6 h-6 transition-all duration-300", def.colorClass, def.glowClass].join(" ")} />
      </div>

      {/* Label + count */}
      <div className="text-center">
        <p className="text-[13px] font-semibold leading-tight text-white/90 group-hover:text-white sm:text-sm">{def.label}</p>
        <p className="mt-0.5 text-[10px] text-white/40 font-mono sm:text-[11px]">
          {count} {countLabel}
        </p>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────
// Main Dashboard Content
// ─────────────────────────────────────────────

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const store = useFileStore();
  const {
    items: clipboardItems,
    action: clipboardAction,
    paste: clipboardPaste,
    hasClipboard,
    copy: clipboardCopy,
    cut: clipboardCut,
  } = useClipboardStore();
  const { addToast } = useToastStore();
  const { recoverUploads, addUpload, uploads } = useUploadStore();
  const { menu: bgContextMenu, open: openBgContextMenu, close: closeBgContextMenu } = useContextMenu();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [localSearch, setLocalSearch] = useState("");
  const [viewFiles, setViewFiles] = useState<FileItem[]>([]);
  const [viewFolders, setViewFolders] = useState<FolderItem[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [confirmBatchTrash, setConfirmBatchTrash] = useState(false);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const completedUploadIdsRef = useRef(new Set<string>());

  const isSpecialView = !!view;
  const isTrashView = view === "trash";
  const isRecentView = view === "recent";
  const isPhotosView = view === "photos";
  const isStarredView = view === "starred";
  const displayedFolderId = store.currentFolderId;
  const refreshFiles = store.fetchFiles;
  const refreshFolders = store.fetchFolders;

  // Cancel stale uploads on page load
  useEffect(() => { recoverUploads(); }, [recoverUploads]);

  // Native mobile shell bridge. The Capacitor wrapper can pass camera/gallery
  // files to the existing upload queue without duplicating any file-manager UI.
  useEffect(() => {
    const handleNativeMessage = async (event: MessageEvent) => {
      if (window.parent === window || event.source !== window.parent) return;

      const message = event.data;
      if (
        !message ||
        message.source !== "nexxcloud-mobile-shell" ||
        message.type !== "native-upload-files" ||
        !Array.isArray(message.files)
      ) {
        return;
      }

      if (!isAuthenticated) {
        addToast("Sign in before uploading from the mobile app", "error");
        window.parent.postMessage({ source: "nexxcloud-web", type: "native-upload-rejected" }, "*");
        return;
      }

      try {
        const files = await Promise.all(
          message.files.map((file: NativeUploadFilePayload) => nativePayloadToFile(file))
        );

        for (const file of files) {
          await addUpload(file, isSpecialView ? undefined : store.currentFolderId || undefined);
        }

        addToast(`Started ${files.length} mobile upload${files.length === 1 ? "" : "s"}`, "success");
        window.parent.postMessage({ source: "nexxcloud-web", type: "native-upload-accepted", count: files.length }, "*");
      } catch {
        addToast("Could not import the selected mobile file", "error");
        window.parent.postMessage({ source: "nexxcloud-web", type: "native-upload-failed" }, "*");
      }
    };

    window.addEventListener("message", handleNativeMessage);
    return () => window.removeEventListener("message", handleNativeMessage);
  }, [addToast, addUpload, isAuthenticated, isSpecialView, store.currentFolderId]);

  // Clear category filter when navigating to a special view
  useEffect(() => {
    if (view) setActiveCategoryFilter(null);
  }, [view]);

  const currentDisplayFiles = isSpecialView ? viewFiles : store.files;
  const currentDisplayFolders = isSpecialView ? viewFolders : store.folders;
  const activeCategoryDef = activeCategoryFilter
    ? CATEGORY_DEFS.find((d) => d.id === activeCategoryFilter)
    : undefined;
  const isFolderFilter = activeCategoryDef?.kind === "folders";

  // Build category counts from all current files (before category filter)
  const categoryCounts = CATEGORY_DEFS.reduce<Record<string, number>>((acc, def) => {
    acc[def.id] = def.kind === "folders"
      ? currentDisplayFolders.length
      : currentDisplayFiles.filter(
          (f) => def.categories.includes(f.category as FileCategory)
        ).length;
    return acc;
  }, {});

  // Apply category filter then local search
  const categoryFilteredFiles = isFolderFilter
    ? []
    : activeCategoryDef
    ? currentDisplayFiles.filter((f) => {
        return activeCategoryDef.categories.includes(f.category as FileCategory);
      })
    : currentDisplayFiles;

  const localFilteredFiles = localSearch
    ? categoryFilteredFiles.filter((f) =>
        f.originalName.toLowerCase().includes(localSearch.toLowerCase())
      )
    : categoryFilteredFiles;

  const folderFilteredFolders = activeCategoryDef && !isFolderFilter
    ? []
    : currentDisplayFolders;

  const localFilteredFolders = localSearch
    ? folderFilteredFolders.filter((f) =>
        f.name.toLowerCase().includes(localSearch.toLowerCase())
      )
    : folderFilteredFolders;

  // Fetch data on mount and when folder changes
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    if (isSpecialView) {
      setViewLoading(true);
      if (isRecentView) {
        filesApi.recent().then((res) => setViewFiles(res.data.data)).catch(() => setViewFiles([])).finally(() => setViewLoading(false));
      } else if (isPhotosView) {
        filesApi.list({ category: "images", limit: 500 })
          .then((res) => { setViewFiles(res.data.data); setViewFolders([]); })
          .catch(() => setViewFiles([]))
          .finally(() => setViewLoading(false));
      } else if (isStarredView) {
        filesApi.favorites().then((res) => setViewFiles(res.data.data)).catch(() => setViewFiles([])).finally(() => setViewLoading(false));
      } else if (isTrashView) {
        Promise.all([filesApi.listTrash(), foldersApi.listTrash()])
          .then(([filesRes, foldersRes]) => { setViewFiles(filesRes.data.data); setViewFolders(foldersRes.data.data); })
          .catch(() => { setViewFiles([]); setViewFolders([]); })
          .finally(() => setViewLoading(false));
      } else {
        setViewLoading(false);
      }
    } else {
      store.fetchFiles(store.currentFolderId);
      store.fetchFolders(store.currentFolderId);
      if (store.currentFolderId) store.fetchBreadcrumb(store.currentFolderId);
    }
  }, [isAuthenticated, authLoading, store.currentFolderId, view]);

  // The visible drive view owns upload reconciliation so uploads from every
  // entrypoint appear as soon as backend processing has completed.
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const completedUploads = uploads.filter((upload) => upload.status === "completed");
    const newlyCompleted = completedUploads.filter(
      (upload) => !completedUploadIdsRef.current.has(upload.id)
    );

    completedUploads.forEach((upload) => completedUploadIdsRef.current.add(upload.id));
    if (newlyCompleted.length === 0) return;

    if (isRecentView) {
      setViewLoading(true);
      filesApi.recent()
        .then((response) => setViewFiles(response.data.data))
        .catch(() => setViewFiles([]))
        .finally(() => setViewLoading(false));
      return;
    }

    if (!isSpecialView) {
      const currentFolderHasUpload = newlyCompleted.some(
        (upload) => (upload.folderId || null) === displayedFolderId
      );

      if (currentFolderHasUpload) {
        refreshFiles(displayedFolderId);
        refreshFolders(displayedFolderId);
      }
    }
  }, [
    uploads,
    isAuthenticated,
    authLoading,
    isRecentView,
    isSpecialView,
    displayedFolderId,
    refreshFiles,
    refreshFolders,
  ]);

  // Sort files
  const sortItems = <T extends { originalName?: string; name?: string; createdAt: string; size?: number; category?: string }>(
    items: T[],
    sortBy: typeof store.sortBy,
    sortOrder: typeof store.sortOrder
  ): T[] => {
    return [...items].sort((a, b) => {
      const dir = sortOrder === "asc" ? 1 : -1;
      switch (sortBy) {
        case "name": return dir * ((a.originalName || a.name || "").localeCompare(b.originalName || b.name || ""));
        case "size": return dir * ((a.size || 0) - (b.size || 0));
        case "type": return dir * ((a.category || "").localeCompare(b.category || ""));
        case "date":
        default: return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    });
  };

  const sortedFiles = sortItems(isSpecialView ? localFilteredFiles : localFilteredFiles, store.sortBy, store.sortOrder);
  const sortedFolders = sortItems(localFilteredFolders, store.sortBy, store.sortOrder);

  const allItems = isSpecialView
    ? (isTrashView
      ? [...sortedFolders.map((f) => ({ type: "folder" as const, data: f })), ...sortedFiles.map((f) => ({ type: "file" as const, data: f }))]
      : sortedFiles.map((f) => ({ type: "file" as const, data: f })))
    : [...sortedFolders.map((f) => ({ type: "folder" as const, data: f })), ...sortedFiles.map((f) => ({ type: "file" as const, data: f }))];

  const selectedCount = store.selectedIds.size;

  const handleSpecialViewItemsRemoved = useCallback((ids: string[]) => {
    if (!isSpecialView) return;
    const idSet = new Set(ids);
    setViewFiles((files) => files.filter((file) => !idSet.has(file.id)));
    setViewFolders((folders) => folders.filter((folder) => !idSet.has(folder.id)));
  }, [isSpecialView]);

  const handleSpecialViewItemRemoved = useCallback((id: string) => {
    handleSpecialViewItemsRemoved([id]);
  }, [handleSpecialViewItemsRemoved]);

  const deleteSelectedTrashItems = useCallback(async () => {
    const ids = Array.from(store.selectedIds);
    const fileIds = ids.filter((id) => viewFiles.some((file) => file.id === id));
    const folderIds = ids.filter((id) => viewFolders.some((folder) => folder.id === id));
    const fileResults = await Promise.allSettled(
      fileIds.map((id) => store.permanentDeleteFile(id).then(() => id))
    );
    const folderResults = await Promise.allSettled(
      folderIds.map((id) => store.permanentDeleteFolder(id).then(() => id))
    );
    const succeededIds = [...fileResults, ...folderResults]
      .filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled")
      .map((result) => result.value);
    const failedCount = [...fileResults, ...folderResults].filter((result) => result.status === "rejected").length;

    handleSpecialViewItemsRemoved(succeededIds);
    return { requestedCount: ids.length, deletedCount: succeededIds.length, failedCount };
  }, [store, viewFiles, viewFolders, handleSpecialViewItemsRemoved]);

  // Drag-and-drop handlers
  const handleFileDrop = useCallback(async (items: any[], targetFolderId: string | null) => {
    for (const item of items) {
      try {
        if (item.type === "file") {
          await filesApiMove(item.id, targetFolderId);
        }
      } catch {
        addToast(`Failed to move "${item.name}"`, "error");
      }
    }
    addToast(`Moved ${items.length} item(s)`, "success");
    store.fetchFiles(store.currentFolderId);
    store.fetchFolders(store.currentFolderId);
  }, [store, addToast]);

  const handleFolderDragOver = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverFolder(folderId);
  }, []);

  const handleFolderDragLeave = useCallback(() => {
    setDragOverFolder(null);
  }, []);

  const handleFolderDrop = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
    try {
      const data = e.dataTransfer.getData("application/json");
      if (data) {
        const items = JSON.parse(data);
        handleFileDrop(items, folderId);
      }
    } catch { }
  }, [handleFileDrop]);

  // Background context menu
  const handleBgContextMenu = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-file-card]")) return;

    const items: ContextMenuItem[] = [
      { label: "New Folder", icon: <FolderPlus className="w-4 h-4" />, shortcut: "mod+shift+N", onClick: () => setIsNewFolderOpen(true) },
      { divider: true, label: "", onClick: () => { } },
      { label: "Upload Files", icon: <Upload className="w-4 h-4" />, onClick: () => setIsUploadOpen(true) },
    ];

    if (hasClipboard()) {
      items.push(
        { divider: true, label: "", onClick: () => { } },
        { label: `Paste ${clipboardItems.length} item(s)`, icon: <ClipboardPaste className="w-4 h-4" />, shortcut: "mod+V", onClick: handlePaste },
      );
    }

    items.push(
      { divider: true, label: "", onClick: () => { } },
      { label: "Select All", icon: <Copy className="w-4 h-4" />, shortcut: "mod+A", onClick: () => store.selectAll() },
    );

    openBgContextMenu(e, items);
  }, [hasClipboard, clipboardItems, store, openBgContextMenu]);

  // Clipboard paste
  const handlePaste = useCallback(async () => {
    const result = await clipboardPaste(store.currentFolderId);
    if (result.success > 0) addToast(`Pasted ${result.success} item(s)`, "success");
    if (result.failed > 0) addToast(`Failed to paste ${result.failed} item(s)`, "error");
    store.fetchFiles(store.currentFolderId);
    store.fetchFolders(store.currentFolderId);
  }, [clipboardPaste, store, addToast]);

  // Copy to clipboard
  const handleCopy = useCallback(() => {
    const { files, folders } = store;
    const items = [
      ...files.filter((f) => store.selectedIds.has(f.id)).map((f) => ({ id: f.id, type: "file" as const, name: f.originalName })),
      ...folders.filter((f) => store.selectedIds.has(f.id)).map((f) => ({ id: f.id, type: "folder" as const, name: f.name })),
    ];
    if (items.length > 0) {
      clipboardCopy(items, store.currentFolderId);
      addToast(`Copied ${items.length} item(s)`, "info");
    }
  }, [store, clipboardCopy, addToast]);

  // Cut to clipboard
  const handleCut = useCallback(() => {
    const { files, folders } = store;
    const items = [
      ...files.filter((f) => store.selectedIds.has(f.id)).map((f) => ({ id: f.id, type: "file" as const, name: f.originalName })),
      ...folders.filter((f) => store.selectedIds.has(f.id)).map((f) => ({ id: f.id, type: "folder" as const, name: f.name })),
    ];
    if (items.length > 0) {
      clipboardCut(items, store.currentFolderId);
      addToast(`Cut ${items.length} item(s)`, "info");
    }
  }, [store, clipboardCut, addToast]);

  // Delete (move to trash)
  const handleDelete = useCallback(() => {
    if (selectedCount > 0) setConfirmBatchTrash(true);
  }, [selectedCount]);

  // Permanent delete
  const handlePermanentDelete = useCallback(async () => {
    if (isTrashView && selectedCount > 0) {
      setIsBatchProcessing(true);
      const result = await deleteSelectedTrashItems();
      store.clearSelection();
      if (result.deletedCount > 0) {
        addToast(`Permanently deleted ${result.deletedCount} item(s)`, "success");
      }
      if (result.failedCount > 0) {
        addToast(`${result.failedCount} item(s) could not be deleted`, "error");
      }
      setIsBatchProcessing(false);
    }
  }, [store, selectedCount, isTrashView, addToast, deleteSelectedTrashItems]);

  // Duplicate
  const handleDuplicate = useCallback(async () => {
    const ids = Array.from(store.selectedIds);
    for (const id of ids) {
      try {
        await store.duplicateFile(id);
      } catch { }
    }
    store.fetchFiles(store.currentFolderId);
    addToast(`Duplicated ${ids.length} item(s)`, "success");
  }, [store, addToast]);

  // Open/Enter
  const handleOpen = useCallback(() => {
    if (selectedCount === 1) {
      const id = Array.from(store.selectedIds)[0];
      const file = sortedFiles.find((f) => f.id === id);
      if (file) {
        setPreviewFile(file);
        setPreviewIndex(sortedFiles.indexOf(file));
      }
    }
  }, [store.selectedIds, sortedFiles]);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    {
      "mod+a": () => store.selectAllInFolder(),
      "mod+d": () => { if (selectedCount > 0) handleDuplicate(); },
      "escape": () => { store.clearSelection(); setPreviewFile(null); },
      "mod+c": () => handleCopy(),
      "mod+x": () => handleCut(),
      "mod+v": () => { if (hasClipboard()) handlePaste(); },
      "delete": () => handleDelete(),
      "shift+delete": () => handlePermanentDelete(),
      " ": (e) => {
        e.preventDefault();
        if (store.selectedIds.size === 1) {
          const id = Array.from(store.selectedIds)[0];
          const file = sortedFiles.find((f) => f.id === id);
          if (file) { setPreviewFile(file); setPreviewIndex(sortedFiles.indexOf(file)); }
        }
      },
      "enter": () => handleOpen(),
      "mod+f": (e) => {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
      },
    },
    [store, selectedCount, hasClipboard, handleCopy, handleCut, handlePaste, handleDelete, handlePermanentDelete, handleDuplicate, handleOpen, sortedFiles, isTrashView]
  );

  // Batch trash
  const handleBatchTrash = async () => {
    setIsBatchProcessing(true);
    try {
      if (isTrashView) {
        const result = await deleteSelectedTrashItems();
        if (result.deletedCount > 0) {
          addToast(`Permanently deleted ${result.deletedCount} item(s)`, "success");
        }
        if (result.failedCount > 0) {
          addToast(`${result.failedCount} item(s) could not be deleted`, "error");
        }
      } else {
        await store.trashMultiple(Array.from(store.selectedIds));
        addToast(`Moved ${selectedCount} item(s) to trash`, "success");
      }
      store.clearSelection();
    } catch {
      addToast(isTrashView ? "Failed to delete items" : "Failed to trash items", "error");
    }
    setIsBatchProcessing(false);
    setConfirmBatchTrash(false);
  };

  // Empty trash
  const handleEmptyTrash = async () => {
    setIsBatchProcessing(true);
    try {
      await store.emptyTrash();
      setViewFiles([]);
      setViewFolders([]);
      addToast("Trash emptied", "success");
    } catch {
      addToast("Failed to empty trash", "error");
    }
    setIsBatchProcessing(false);
    setConfirmEmptyTrash(false);
  };

  // Navigation
  const handleFolderNavigate = (folderId: string) => {
    store.setCurrentFolder(folderId);
    setLocalSearch("");
    setActiveCategoryFilter(null);
  };

  const handleBack = () => store.navigateBack();
  const handleForward = () => store.navigateForward();

  // Preview
  const handlePreviewNavigate = (direction: "prev" | "next") => {
    const newIndex = direction === "prev" ? previewIndex - 1 : previewIndex + 1;
    if (newIndex >= 0 && newIndex < sortedFiles.length) {
      setPreviewIndex(newIndex);
      setPreviewFile(sortedFiles[newIndex]);
    }
  };

  if (authLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <AppShell>
      <Header
        onUploadClick={() => setIsUploadOpen(true)}
        onNewFolderClick={() => setIsNewFolderOpen(true)}
        onSearchChange={setLocalSearch}
      />

      <main className="flex-1 overflow-auto overflow-x-hidden" onContextMenu={handleBgContextMenu}>
        <div className="space-y-4 p-3 sm:space-y-5 sm:p-4 md:p-6">
          {/* Navigation bar */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={handleBack}
              disabled={store.historyIndex <= 0}
              className="p-1.5 rounded-lg hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all disabled:opacity-30"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 text-white/60" />
            </button>
            <button
              onClick={handleForward}
              disabled={store.historyIndex >= store.history.length - 1}
              className="p-1.5 rounded-lg hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all disabled:opacity-30"
              title="Forward"
            >
              <ArrowRight className="w-4 h-4 text-white/60" />
            </button>
            <Breadcrumb onNavigate={(id) => store.setCurrentFolder(id)} />
          </div>

          {/* ── Main Drive View ── */}
          {!isSpecialView && (
            <>
              {/* My Drive Header */}
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-white tracking-tight">My Drive</h1>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/5 px-3.5 py-2 text-xs font-medium text-cyan-300 transition-all duration-300 hover:border-cyan-400/60 hover:bg-cyan-500/10 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] sm:gap-2 sm:px-4 sm:text-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </button>
              </div>

              {/* Category Shortcut Cards */}
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 no-scrollbar sm:mx-0 sm:flex-nowrap sm:overflow-visible sm:px-0">
                {CATEGORY_DEFS.map((def) => (
                  <CategoryCard
                    key={def.id}
                    def={def}
                    count={categoryCounts[def.id] ?? 0}
                    isActive={activeCategoryFilter === def.id}
                    onClick={() =>
                      setActiveCategoryFilter(
                        activeCategoryFilter === def.id ? null : def.id
                      )
                    }
                  />
                ))}
              </div>

              {/* Active filter label */}
              {activeCategoryFilter && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">Filtering by</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/70 font-medium">
                    {CATEGORY_DEFS.find((d) => d.id === activeCategoryFilter)?.label}
                  </span>
                  <button
                    onClick={() => setActiveCategoryFilter(null)}
                    className="text-xs text-white/30 hover:text-white/70 transition-colors"
                  >
                    ✕ Clear
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Special View Titles ── */}
          {isRecentView && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                <Clock className="w-4.5 h-4.5 text-white/50" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Recent Files</h2>
                <p className="text-xs text-white/40">Recently uploaded files</p>
              </div>
            </div>
          )}
          {isPhotosView && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                <Image className="w-4.5 h-4.5 text-white/50" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Photos</h2>
                <p className="text-xs text-white/40">All image files across your drive</p>
              </div>
            </div>
          )}
          {isStarredView && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                <Star className="w-4.5 h-4.5 text-white/50" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Favorites</h2>
                <p className="text-xs text-white/40">Your favorite files</p>
              </div>
            </div>
          )}
          {isTrashView && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                  <Trash2 className="w-4.5 h-4.5 text-white/50" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Trash</h2>
                  <p className="text-xs text-white/40">Deleted files and folders</p>
                </div>
              </div>
              {allItems.length > 0 && (
                <button
                  onClick={() => setConfirmEmptyTrash(true)}
                  className="text-xs px-3 py-1.5 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-400/50 transition-all"
                >
                  Empty Trash
                </button>
              )}
            </div>
          )}

          {/* Batch selection toolbar */}
          {selectedCount > 0 && (
            <div>
              <BulkToolbar
                files={isTrashView ? viewFiles : undefined}
                folders={isTrashView ? viewFolders : undefined}
                onItemsRemoved={handleSpecialViewItemsRemoved}
              />
            </div>
          )}

          {/* ── Content ── */}
          {(store.isLoading || viewLoading) ? (
            <div
              className={
                store.viewMode === "grid"
                  ? "grid grid-cols-2 min-[580px]:grid-cols-4 min-[760px]:grid-cols-5 min-[960px]:grid-cols-6 min-[1180px]:grid-cols-7 min-[1440px]:grid-cols-8 gap-[10px]"
                  : "flex flex-col gap-1"
              }
            >
              {(store.viewMode === "grid" ? Array(8).fill(null) : Array(6).fill(null)).map((_, i) => (
                <div
                  key={i}
                  className={
                    store.viewMode === "grid"
                      ? "aspect-square bg-white/[0.02] rounded-2xl border border-white/[0.04] animate-pulse"
                      : "h-12 bg-white/[0.02] rounded-xl border border-white/[0.04] animate-pulse"
                  }
                />
              ))}
            </div>
          ) : allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
                {isTrashView ? (
                  <Trash2 className="w-7 h-7 text-white/30" />
                ) : isRecentView ? (
                  <Clock className="w-7 h-7 text-white/30" />
                ) : isPhotosView ? (
                  <Image className="w-7 h-7 text-white/30" />
                ) : isStarredView ? (
                  <Star className="w-7 h-7 text-white/30" />
                ) : activeCategoryFilter ? (
                  (() => {
                    const Icon = activeCategoryDef?.icon ?? FileX;
                    return <Icon className={`w-7 h-7 ${activeCategoryDef?.colorClass ?? "text-white/30"}`} />;
                  })()
                ) : (
                  <FileX className="w-7 h-7 text-white/30" />
                )}
              </div>
              <h3 className="text-base font-semibold text-white/70 mb-1">
                {isTrashView
                  ? "Trash is empty"
                  : isRecentView
                  ? "No recent files"
                  : isPhotosView
                  ? "No photos found"
                  : isStarredView
                  ? "No favorite files"
                  : isFolderFilter
                  ? "No folders found"
                  : activeCategoryFilter
                  ? `No ${activeCategoryDef?.label ?? "files"} found`
                  : localSearch
                  ? "No files found"
                  : "No files yet"}
              </h3>
              <p className="text-xs text-white/30 mb-6 max-w-xs">
                {isTrashView
                  ? "Deleted files will appear here"
                  : isRecentView
                  ? "Your recently uploaded files will appear here"
                  : isPhotosView
                  ? "Image files you upload will appear here"
                  : isStarredView
                  ? "Favorite files for quick access"
                  : isFolderFilter
                  ? "Create a folder to see it here"
                  : activeCategoryFilter
                  ? "Upload some files to see them here"
                  : localSearch
                  ? `No results for "${localSearch}"`
                  : "Drag and drop files here or click Upload"}
              </p>
              {!isTrashView && !isRecentView && !isStarredView && !localSearch && !activeCategoryFilter && (
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-cyan-400/30 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-400/60 text-cyan-300 text-sm font-medium transition-all duration-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                >
                  <Upload className="w-4 h-4" />
                  Upload Files
                </button>
              )}
              {!isTrashView && !isRecentView && !isStarredView && !localSearch && isFolderFilter && (
                <button
                  onClick={() => setIsNewFolderOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-cyan-400/30 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-400/60 text-cyan-300 text-sm font-medium transition-all duration-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                >
                  <FolderPlus className="w-4 h-4" />
                  New Folder
                </button>
              )}
            </div>
          ) : (
            <VirtualizedContainer
              items={allItems}
              viewMode={store.viewMode}
              renderItem={(item: any) =>
                item.type === "folder" ? (
                  <FolderCard
                    key={(item.data as any).id}
                    folder={item.data as any}
                    viewMode={store.viewMode}
                    onNavigate={handleFolderNavigate}
                    isTrashView={isTrashView}
                    isDropTarget={dragOverFolder === (item.data as any).id}
                    onDragOver={(e) => handleFolderDragOver(e, (item.data as any).id)}
                    onDragLeave={handleFolderDragLeave}
                    onDrop={(e) => handleFolderDrop(e, (item.data as any).id)}
                    onRemoved={handleSpecialViewItemRemoved}
                    onRestored={handleSpecialViewItemRemoved}
                  />
                ) : (
                  <FileCard
                    key={(item.data as any).id}
                    file={item.data as FileItem}
                    viewMode={store.viewMode}
                    onPreview={() => {
                      setPreviewFile(item.data as FileItem);
                      setPreviewIndex(sortedFiles.indexOf(item.data as FileItem));
                    }}
                    isTrashView={isTrashView}
                    draggable
                    onRemoved={handleSpecialViewItemRemoved}
                    onRestored={handleSpecialViewItemRemoved}
                  />
                )
              }
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <UploadDropzone isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} folderId={store.currentFolderId} />
      <NewFolderDialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen} parentId={store.currentFolderId} />
      <PreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onPrev={() => handlePreviewNavigate("prev")}
        onNext={() => handlePreviewNavigate("next")}
        hasPrev={previewIndex > 0}
        hasNext={previewIndex < sortedFiles.length - 1}
      />
      <ConfirmDialog
        open={confirmBatchTrash}
        onOpenChange={setConfirmBatchTrash}
        title={isTrashView ? "Delete Forever" : "Move to Trash"}
        description={
          isTrashView
            ? `${selectedCount} item(s) will be permanently deleted. This cannot be undone.`
            : `${selectedCount} item(s) will be moved to trash.`
        }
        confirmLabel={isTrashView ? "Delete Forever" : "Move to Trash"}
        variant="destructive"
        onConfirm={handleBatchTrash}
        loading={isBatchProcessing}
      />
      <ConfirmDialog
        open={confirmEmptyTrash}
        onOpenChange={setConfirmEmptyTrash}
        title="Empty Trash"
        description="All files and folders in trash will be permanently deleted. This cannot be undone."
        confirmLabel="Empty Trash"
        variant="destructive"
        onConfirm={handleEmptyTrash}
        loading={isBatchProcessing}
      />

      <UploadQueuePanel />
      <ToastContainer />
      <OperationProgressModal />

      {bgContextMenu && (
        <ContextMenu
          x={bgContextMenu.x}
          y={bgContextMenu.y}
          items={bgContextMenu.items}
          onClose={closeBgContextMenu}
        />
      )}
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-[#04020a]">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
