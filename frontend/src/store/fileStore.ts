import { create } from "zustand";
import { filesApi, foldersApi } from "@/lib/api";

export interface FileItem {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  category: string;
  size: number;
  createdAt: string;
  deletedAt?: string | null;
  folderId: string | null;
  thumbnail?: string | null;
  thumbnailSmall?: string | null;
  thumbnailMedium?: string | null;
  thumbnailLarge?: string | null;
  isFavorite?: boolean;
}

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  deletedAt?: string | null;
}

export interface BulkDownloadResult {
  url: string;
  fileCount: number;
  folderCount: number;
  entryCount: number;
  totalBytes: number;
}

interface FileState {
  files: FileItem[];
  folders: FolderItem[];
  recentFiles: FileItem[];
  currentFolderId: string | null;
  breadcrumb: { id: string; name: string }[];
  isLoading: boolean;
  uploadProgress: number;
  isUploading: boolean;
  viewMode: "grid" | "list";
  searchQuery: string;
  sortBy: "name" | "date" | "size" | "type";
  sortOrder: "asc" | "desc";
  error: string | null;

  // Selection
  selectedIds: Set<string>;
  lastSelectedId: string | null;
  toggleSelect: (id: string, event?: MouseEvent) => void;
  selectRange: (startId: string, endId: string) => void;
  selectAll: () => void;
  selectAllInFolder: () => void;
  clearSelection: () => void;
  getSelectedItems: () => { files: FileItem[]; folders: FolderItem[] };
  getSelectedCount: () => number;

  setCurrentFolder: (folderId: string | null) => void;
  setViewMode: (mode: "grid" | "list") => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: "name" | "date" | "size" | "type") => void;
  setSortOrder: (order: "asc" | "desc") => void;
  clearError: () => void;

  fetchFiles: (folderId?: string | null, search?: string) => Promise<void>;
  fetchFolders: (parentId?: string | null) => Promise<void>;
  fetchRecentFiles: () => Promise<void>;
  fetchBreadcrumb: (folderId: string) => Promise<void>;
  fetchTrash: () => Promise<void>;

  uploadFile: (file: File, folderId?: string | null, onProgress?: (progress: number) => void) => Promise<void>;
  uploadMultipleFiles: (files: File[], folderId?: string | null, onProgress?: (progress: number) => void) => Promise<void>;
  downloadFile: (id: string, originalName: string) => Promise<void>;
  downloadSelected: (ids?: string[]) => Promise<BulkDownloadResult>;
  renameFile: (id: string, originalName: string) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  trashFile: (id: string) => Promise<void>;
  restoreFile: (id: string) => Promise<void>;
  permanentDeleteFile: (id: string) => Promise<void>;
  trashMultiple: (ids: string[]) => Promise<void>;
  bulkRestore: (ids: string[]) => Promise<void>;
  permanentDeleteMultiple: (ids: string[]) => Promise<void>;
  emptyTrash: () => Promise<void>;

  createFolder: (name: string, parentId?: string | null) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  trashFolder: (id: string) => Promise<void>;
  restoreFolder: (id: string) => Promise<void>;
  permanentDeleteFolder: (id: string) => Promise<void>;

  duplicateFile: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;

  // Navigation history
  history: (string | null)[];
  historyIndex: number;
  navigateBack: () => void;
  navigateForward: () => void;

  // Folder tree
  folderTree: any[];
  fetchFolderTree: () => Promise<void>;
}

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  folders: [],
  recentFiles: [],
  currentFolderId: null,
  breadcrumb: [],
  isLoading: false,
  uploadProgress: 0,
  isUploading: false,
  viewMode: "grid",
  searchQuery: "",
  sortBy: "date",
  sortOrder: "desc",
  error: null,
  selectedIds: new Set(),
  lastSelectedId: null,
  history: [],
  historyIndex: -1,
  folderTree: [],

  toggleSelect: (id, event) => {
    const state = get();

    if (event?.shiftKey && state.lastSelectedId) {
      state.selectRange(state.lastSelectedId, id);
      return;
    }

    if (event?.ctrlKey || event?.metaKey) {
      set((s) => {
        const newSet = new Set(s.selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        return { selectedIds: newSet, lastSelectedId: id };
      });
    } else {
      set((s) => {
        const newSet = new Set(s.selectedIds);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return { selectedIds: newSet, lastSelectedId: id };
      });
    }
  },

  selectRange: (startId, endId) => {
    const { files, folders } = get();
    const allItems = [...folders.map(f => ({ id: f.id, type: 'folder' as const, name: f.name })),
    ...files.map(f => ({ id: f.id, type: 'file' as const, name: f.originalName }))];

    const startIdx = allItems.findIndex(item => item.id === startId);
    const endIdx = allItems.findIndex(item => item.id === endId);

    if (startIdx === -1 || endIdx === -1) return;

    const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    const idsInRange = allItems.slice(from, to + 1).map(item => item.id);

    set((state) => {
      const newSet = new Set(state.selectedIds);
      idsInRange.forEach(id => newSet.add(id));
      return { selectedIds: newSet, lastSelectedId: endId };
    });
  },

  selectAll: () => {
    const { files, folders } = get();
    const allIds = [...files.map(f => f.id), ...folders.map(f => f.id)];
    set({ selectedIds: new Set(allIds), lastSelectedId: null });
  },

  selectAllInFolder: () => {
    const { files, folders } = get();
    const allIds = [...files.map(f => f.id), ...folders.map(f => f.id)];
    set({ selectedIds: new Set(allIds), lastSelectedId: null });
  },

  clearSelection: () => set({ selectedIds: new Set(), lastSelectedId: null }),

  getSelectedItems: () => {
    const { files, folders, selectedIds } = get();
    const selectedFiles = files.filter(f => selectedIds.has(f.id));
    const selectedFolders = folders.filter(f => selectedIds.has(f.id));
    return { files: selectedFiles, folders: selectedFolders };
  },

  getSelectedCount: () => get().selectedIds.size,

  setCurrentFolder: (folderId) => {
    const { history, historyIndex } = get();
    // Add to history
    const newHistory = [...history.slice(0, historyIndex + 1), folderId];
    set({
      currentFolderId: folderId,
      breadcrumb: [],
      selectedIds: new Set(),
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
    get().fetchFiles(folderId);
    get().fetchFolders(folderId || null);
    if (folderId) get().fetchBreadcrumb(folderId);
  },

  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().fetchFiles(get().currentFolderId, query || undefined);
  },

  setSortBy: (sort) => set({ sortBy: sort }),
  setSortOrder: (order) => set({ sortOrder: order }),
  clearError: () => set({ error: null }),

  fetchFiles: async (folderId, search) => {
    set({ isLoading: true, error: null });
    try {
      const response = await filesApi.list({
        folderId: folderId || undefined,
        search: search || undefined,
      });
      set({ files: response.data.data });
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Failed to load files" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchFolders: async (parentId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await foldersApi.list({ parentId: parentId || undefined });
      set({ folders: response.data.data });
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Failed to load folders" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchRecentFiles: async () => {
    try {
      const response = await filesApi.recent(10);
      set({ recentFiles: response.data.data });
    } catch (error: any) {
      console.error("Failed to load recent files", error);
    }
  },

  fetchBreadcrumb: async (folderId) => {
    try {
      const response = await foldersApi.breadcrumb(folderId);
      set({ breadcrumb: response.data.data });
    } catch (error: any) {
      console.error("Failed to load breadcrumb", error);
    }
  },

  fetchTrash: async () => {
    set({ isLoading: true, error: null });
    try {
      const [filesResponse, foldersResponse] = await Promise.all([
        filesApi.listTrash(),
        foldersApi.listTrash(),
      ]);
      set({ files: filesResponse.data.data, folders: foldersResponse.data.data });
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Failed to load trash" });
    } finally {
      set({ isLoading: false });
    }
  },

  uploadFile: async (file, folderId, onProgress) => {
    set({ isUploading: true, uploadProgress: 0 });
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (folderId) formData.append("folderId", folderId);

      const response = await filesApi.upload(formData, (progress) => {
        set({ uploadProgress: progress });
        onProgress?.(progress);
      });
      set((state) => ({
        files: [response.data.data, ...state.files],
        recentFiles: [response.data.data, ...state.recentFiles].slice(0, 10),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Upload failed" });
      throw error;
    } finally {
      set({ isUploading: false, uploadProgress: 100 });
    }
  },

  uploadMultipleFiles: async (files, folderId, onProgress) => {
    set({ isUploading: true, uploadProgress: 0 });
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      if (folderId) formData.append("folderId", folderId);

      const response = await filesApi.uploadMultiple(formData, (progress) => {
        set({ uploadProgress: progress });
        onProgress?.(progress);
      });
      set((state) => ({
        files: [...response.data.data, ...state.files],
        recentFiles: [...response.data.data, ...state.recentFiles].slice(0, 10),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Upload failed" });
      throw error;
    } finally {
      set({ isUploading: false, uploadProgress: 100 });
    }
  },

  downloadFile: async (id, originalName) => {
    try {
      const response = await filesApi.download(id);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Download failed" });
    }
  },

  downloadSelected: async (ids) => {
    const { selectedIds } = get();
    const requestedIds = ids?.length ? ids : Array.from(selectedIds);

    if (requestedIds.length === 0) {
      set({ error: "Select files or folders to download" });
      throw new Error("Select files or folders to download");
    }

    try {
      const response = await filesApi.createBulkDownload(requestedIds);
      const data = response.data?.data || {};
      const url = data.url;
      if (!url) throw new Error("Download link was not created");

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      return {
        url,
        fileCount: Number(data.fileCount || 0),
        folderCount: Number(data.folderCount || 0),
        entryCount: Number(data.entryCount || 0),
        totalBytes: Number(data.totalBytes || 0),
      };
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message || "Download failed" });
      throw error;
    }
  },

  renameFile: async (id, originalName) => {
    const previousFiles = get().files;
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, originalName } : f
      ),
    }));
    try {
      const response = await filesApi.update(id, { originalName });
      set((state) => ({
        files: state.files.map((f) =>
          f.id === id ? { ...f, originalName: response.data.data.originalName } : f
        ),
      }));
    } catch (error: any) {
      set({ files: previousFiles, error: error.response?.data?.error || "Rename failed" });
      throw error;
    }
  },

  deleteFile: async (id) => {
    try {
      await filesApi.delete(id);
      set((state) => ({
        files: state.files.filter((f) => f.id !== id),
        recentFiles: state.recentFiles.filter((f) => f.id !== id),
        selectedIds: (() => { const s = new Set(state.selectedIds); s.delete(id); return s; })(),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Delete failed" });
      throw error;
    }
  },

  trashFile: async (id) => {
    const previousFiles = get().files;
    const previousRecent = get().recentFiles;
    const previousSelected = get().selectedIds;
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
      recentFiles: state.recentFiles.filter((f) => f.id !== id),
      selectedIds: (() => { const s = new Set(state.selectedIds); s.delete(id); return s; })(),
    }));
    try {
      await filesApi.trash(id);
    } catch (error: any) {
      set({
        files: previousFiles,
        recentFiles: previousRecent,
        selectedIds: previousSelected,
        error: error.response?.data?.error || "Trash failed",
      });
      throw error;
    }
  },

  restoreFile: async (id) => {
    const previousFiles = get().files;
    const previousSelected = get().selectedIds;
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
      selectedIds: (() => { const s = new Set(state.selectedIds); s.delete(id); return s; })(),
    }));
    try {
      await filesApi.restore(id);
    } catch (error: any) {
      set({ files: previousFiles, selectedIds: previousSelected, error: error.response?.data?.error || "Restore failed" });
      throw error;
    }
  },

  permanentDeleteFile: async (id) => {
    try {
      await filesApi.permanentDelete(id);
      set((state) => ({
        files: state.files.filter((f) => f.id !== id),
        selectedIds: (() => { const s = new Set(state.selectedIds); s.delete(id); return s; })(),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Delete failed" });
      throw error;
    }
  },

  trashMultiple: async (ids) => {
    try {
      const { files, folders } = get();
      const fileIds = ids.filter(id => files.some(f => f.id === id));
      const folderIds = ids.filter(id => folders.some(f => f.id === id));

      const fileResults = await Promise.allSettled(
        fileIds.map((id) => filesApi.trash(id).then(() => id))
      );
      const folderResults = await Promise.allSettled(
        folderIds.map((id) => foldersApi.trash(id).then(() => id))
      );

      const allResults = [...fileResults, ...folderResults];
      const succeededIds = allResults
        .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
        .map((r) => r.value);
      const failedCount = allResults.filter((r) => r.status === "rejected").length;

      set((state) => ({
        files: state.files.filter((f) => !succeededIds.includes(f.id)),
        folders: state.folders.filter((f) => !succeededIds.includes(f.id)),
        recentFiles: state.recentFiles.filter((f) => !succeededIds.includes(f.id)),
        selectedIds: new Set(),
        error: failedCount > 0 ? `${failedCount} item(s) could not be trashed. Already removed or not found.` : null,
      }));
      if (folderResults.some((r) => r.status === "fulfilled")) {
        await get().fetchFolderTree();
      }
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Trash failed" });
    }
  },

  bulkRestore: async (ids) => {
    try {
      const { files, folders } = get();
      const fileIds = ids.filter(id => files.some(f => f.id === id));
      const folderIds = ids.filter(id => folders.some(f => f.id === id));

      const fileResults = await Promise.allSettled(
        fileIds.map((id) => filesApi.restore(id).then(() => id))
      );
      const folderResults = await Promise.allSettled(
        folderIds.map((id) => foldersApi.restore(id).then(() => id))
      );

      const allResults = [...fileResults, ...folderResults];
      const succeededIds = allResults
        .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
        .map((r) => r.value);
      const failedCount = allResults.filter((r) => r.status === "rejected").length;

      set((state) => ({
        files: state.files.filter((f) => !succeededIds.includes(f.id)),
        folders: state.folders.filter((f) => !succeededIds.includes(f.id)),
        selectedIds: new Set(),
        error: failedCount > 0 ? `${failedCount} item(s) could not be restored.` : null,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Restore failed" });
    }
  },

  permanentDeleteMultiple: async (ids) => {
    try {
      const { files, folders } = get();
      const fileIds = ids.filter(id => files.some(f => f.id === id));
      const folderIds = ids.filter(id => folders.some(f => f.id === id));

      const fileResults = await Promise.allSettled(
        fileIds.map((id) => filesApi.permanentDelete(id).then(() => id))
      );
      const folderResults = await Promise.allSettled(
        folderIds.map((id) => foldersApi.permanentDelete(id).then(() => id))
      );

      const allResults = [...fileResults, ...folderResults];
      const succeededIds = allResults
        .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
        .map((r) => r.value);
      const failedCount = allResults.filter((r) => r.status === "rejected").length;

      set((state) => ({
        files: state.files.filter((f) => !succeededIds.includes(f.id)),
        folders: state.folders.filter((f) => !succeededIds.includes(f.id)),
        recentFiles: state.recentFiles.filter((f) => !succeededIds.includes(f.id)),
        selectedIds: new Set(),
        error: failedCount > 0 ? `${failedCount} item(s) could not be deleted.` : null,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Delete failed" });
    }
  },

  emptyTrash: async () => {
    try {
      const trashedFolders = await foldersApi.listTrash();
      const folderIds = trashedFolders.data.data.map((folder: FolderItem) => folder.id);

      const results = await Promise.allSettled([
        filesApi.emptyTrash(),
        ...folderIds.map((id: string) => foldersApi.permanentDelete(id)),
      ]);
      const failedCount = results.filter((result) => result.status === "rejected").length;
      if (failedCount > 0) {
        throw new Error(`${failedCount} trash item(s) could not be deleted`);
      }

      set({ files: [], folders: [], selectedIds: new Set() });
      if (folderIds.length > 0) {
        await get().fetchFolderTree();
      }
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Empty trash failed" });
      throw error;
    }
  },

  createFolder: async (name, parentId) => {
    try {
      const response = await foldersApi.create({ name, parentId: parentId || null });
      set((state) => ({ folders: [...state.folders, response.data.data] }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Failed to create folder" });
      throw error;
    }
  },

  renameFolder: async (id, name) => {
    const previousFolders = get().folders;
    const previousBreadcrumb = get().breadcrumb;
    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === id ? { ...f, name } : f
      ),
      breadcrumb: state.breadcrumb.map((b) =>
        b.id === id ? { ...b, name } : b
      ),
    }));
    try {
      const response = await foldersApi.update(id, { name });
      set((state) => ({
        folders: state.folders.map((f) =>
          f.id === id ? { ...f, name: response.data.data.name } : f
        ),
        breadcrumb: state.breadcrumb.map((b) =>
          b.id === id ? { ...b, name: response.data.data.name } : b
        ),
      }));
    } catch (error: any) {
      set({
        folders: previousFolders,
        breadcrumb: previousBreadcrumb,
        error: error.response?.data?.error || "Rename failed",
      });
      throw error;
    }
  },

  deleteFolder: async (id) => {
    try {
      await foldersApi.delete(id);
      set((state) => ({
        folders: state.folders.filter((f) => f.id !== id),
        files: state.files.filter((f) => f.folderId !== id),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Delete failed" });
      throw error;
    }
  },

  trashFolder: async (id) => {
    const previousFolders = get().folders;
    const previousFiles = get().files;
    const previousSelected = get().selectedIds;
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
      files: state.files.filter((f) => f.folderId !== id),
      selectedIds: (() => { const s = new Set(state.selectedIds); s.delete(id); return s; })(),
    }));
    try {
      await foldersApi.trash(id);
      await get().fetchFolderTree();
    } catch (error: any) {
      set({
        folders: previousFolders,
        files: previousFiles,
        selectedIds: previousSelected,
        error: error.response?.data?.error || "Trash failed",
      });
      throw error;
    }
  },

  restoreFolder: async (id) => {
    const previousFolders = get().folders;
    const previousSelected = get().selectedIds;
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
      selectedIds: (() => { const s = new Set(state.selectedIds); s.delete(id); return s; })(),
    }));
    try {
      await foldersApi.restore(id);
      await get().fetchFolderTree();
    } catch (error: any) {
      set({
        folders: previousFolders,
        selectedIds: previousSelected,
        error: error.response?.data?.error || "Restore failed",
      });
      throw error;
    }
  },

  permanentDeleteFolder: async (id) => {
    const previousFolders = get().folders;
    const previousSelected = get().selectedIds;
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
      selectedIds: (() => { const s = new Set(state.selectedIds); s.delete(id); return s; })(),
    }));
    try {
      await foldersApi.permanentDelete(id);
      await get().fetchFolderTree();
    } catch (error: any) {
      set({
        folders: previousFolders,
        selectedIds: previousSelected,
        error: error.response?.data?.error || "Delete failed",
      });
      throw error;
    }
  },

  duplicateFile: async (id) => {
    try {
      const { filesApiDuplicate } = await import("@/lib/api");
      const response = await filesApiDuplicate(id);
      const newFile = response.data.data;
      set((state) => ({
        files: [newFile, ...state.files],
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || "Duplicate failed" });
      throw error;
    }
  },

  toggleFavorite: async (id) => {
    const previousFiles = get().files;
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, isFavorite: !f.isFavorite } : f
      ),
    }));
    try {
      const response = await filesApi.toggleFavorite(id);
      set((state) => ({
        files: state.files.map((f) =>
          f.id === id ? { ...f, isFavorite: response.data.data.isFavorite } : f
        ),
      }));
    } catch (error: any) {
      set({ files: previousFiles, error: error.response?.data?.error || "Favorite failed" });
    }
  },

  navigateBack: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevFolder = history[historyIndex - 1];
      set({ historyIndex: historyIndex - 1, currentFolderId: prevFolder });
      get().fetchFiles(prevFolder);
      get().fetchFolders(prevFolder);
    }
  },

  navigateForward: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextFolder = history[historyIndex + 1];
      set({ historyIndex: historyIndex + 1, currentFolderId: nextFolder });
      get().fetchFiles(nextFolder);
      get().fetchFolders(nextFolder);
    }
  },

  fetchFolderTree: async () => {
    try {
      const response = await foldersApi.tree();
      set({ folderTree: response.data.data });
    } catch { }
  },
}));
