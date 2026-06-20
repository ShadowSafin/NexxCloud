import { create } from "zustand";
import {
  UploadTask,
  uploadFileChunked,
  pauseUploadTask,
  cancelUploadTask,
  retryFailedChunks,
  shouldUseChunkedUpload,
  cancelUpload as cancelUploadApi,
  getResumeInfo,
} from "../lib/chunkedUpload";
import { filesApi } from "../lib/api";

const STORAGE_KEY = "nexxcloud-uploads";
const DEFAULT_UPLOAD_CHUNK_SIZE = 64 * 1024 * 1024;

// Shared task map
const taskMap = new Map<string, UploadTask>();

function getTask(id: string): UploadTask | undefined {
  return taskMap.get(id);
}

function setTask(task: UploadTask): void {
  taskMap.set(task.id, task);
  persistTasks();
}

function removeTask(id: string): void {
  taskMap.delete(id);
  persistTasks();
}

// Persist task metadata (not File objects) to localStorage
function persistTasks(): void {
  try {
    const data = Array.from(taskMap.values()).map((t) => ({
      id: t.id,
      sessionId: t.sessionId,
      filename: t.filename,
      totalSize: t.totalSize,
      chunkSize: t.chunkSize,
      totalChunks: t.totalChunks,
      uploadedChunks: Array.from(t.uploadedChunks),
      status: t.status,
      folderId: t.folderId,
      progress: t.progress,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function loadPersistedTasks(): any[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

interface UploadStore {
  uploads: UploadTask[];
  isVisible: boolean;

  addUpload: (file: File, folderId?: string) => Promise<void>;
  pauseUpload: (id: string) => void;
  resumeUpload: (id: string) => void;
  cancelUpload: (id: string) => void;
  retryUpload: (id: string) => void;
  removeUpload: (id: string) => void;
  clearCompleted: () => void;
  setVisible: (visible: boolean) => void;
  recoverUploads: () => Promise<void>;
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  uploads: [],
  isVisible: false,

  addUpload: async (file: File, folderId?: string) => {
    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const syncToStore = () => {
      set((state) => ({
        uploads: Array.from(taskMap.values()),
        isVisible: true,
      }));
      persistTasks();
    };

    if (shouldUseChunkedUpload(file)) {
      const task: UploadTask = {
        id,
        file,
        sessionId: "",
        filename: file.name,
        totalSize: file.size,
        chunkSize: DEFAULT_UPLOAD_CHUNK_SIZE,
        totalChunks: Math.ceil(file.size / DEFAULT_UPLOAD_CHUNK_SIZE),
        uploadedChunks: new Set(),
        failedChunks: new Map(),
        status: "uploading",
        progress: 0,
        speed: 0,
        folderId,
        startedAt: Date.now(),
      };

      setTask(task);
      syncToStore();

      uploadFileChunked(file, folderId, syncToStore, id, task).catch((err) => {
        task.status = "failed";
        task.error = err.message;
        syncToStore();
      });
    } else {
      const task: UploadTask = {
        id,
        file,
        sessionId: "",
        filename: file.name,
        totalSize: file.size,
        chunkSize: file.size,
        totalChunks: 1,
        uploadedChunks: new Set(),
        failedChunks: new Map(),
        status: "uploading",
        progress: 0,
        speed: 0,
        folderId,
        startedAt: Date.now(),
      };

      setTask(task);
      syncToStore();

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (folderId) formData.append("folderId", folderId);
        await filesApi.upload(formData);
        task.status = "completed";
        task.progress = 1;
        task.completedAt = Date.now();
      } catch (err: any) {
        task.status = "failed";
        task.error = err.message || "Upload failed";
      }
      syncToStore();
    }
  },

  pauseUpload: (id: string) => {
    const task = getTask(id);
    if (task) {
      pauseUploadTask(task);
      set({ uploads: Array.from(taskMap.values()) });
      persistTasks();
    }
  },

  resumeUpload: (id: string) => {
    const task = getTask(id);
    if (task && task.file && task.sessionId) {
      task.status = "uploading";
      set({ uploads: Array.from(taskMap.values()) });
      persistTasks();

      const syncToStore = () => {
        set({ uploads: Array.from(taskMap.values()) });
        persistTasks();
      };

      retryFailedChunks(task, syncToStore).catch(() => {});
    }
  },

  cancelUpload: (id: string) => {
    const task = getTask(id);
    if (task) {
      cancelUploadTask(task);
      // Remove from map after a short delay so the UI shows cancelled state
      setTimeout(() => {
        removeTask(id);
        set({ uploads: Array.from(taskMap.values()) });
      }, 500);
    }
  },

  retryUpload: (id: string) => {
    const task = getTask(id);
    if (task) {
      const syncToStore = () => {
        set({ uploads: Array.from(taskMap.values()) });
        persistTasks();
      };
      retryFailedChunks(task, syncToStore);
    }
  },

  removeUpload: (id: string) => {
    removeTask(id);
    set({ uploads: Array.from(taskMap.values()) });
  },

  clearCompleted: () => {
    for (const [id, task] of Array.from(taskMap.entries())) {
      if (task.status === "completed" || task.status === "cancelled") removeTask(id);
    }
    set({ uploads: Array.from(taskMap.values()) });
  },

  setVisible: (visible: boolean) => {
    set({ isVisible: visible });
  },

  // Called on page load - cancel stale sessions that were in-progress
  recoverUploads: async () => {
    const persisted = loadPersistedTasks();
    if (persisted.length === 0) return;

    for (const p of persisted) {
      // Any session that was uploading/merging is now stale (File object lost)
      if (p.status === "uploading" || p.status === "merging" || p.status === "paused") {
        // Cancel the server-side session
        if (p.sessionId) {
          try { await cancelUploadApi(p.sessionId); } catch {}
        }
        // Show as cancelled
        const task: UploadTask = {
          id: p.id,
          file: null as any,
          sessionId: p.sessionId || "",
          filename: p.filename,
          totalSize: p.totalSize,
          chunkSize: p.chunkSize,
          totalChunks: p.totalChunks,
          uploadedChunks: new Set(p.uploadedChunks || []),
          failedChunks: new Map(),
          status: "cancelled",
          progress: p.progress || 0,
          speed: 0,
          folderId: p.folderId,
          startedAt: Date.now(),
          error: "Upload cancelled due to page refresh",
        };
        setTask(task);
      }
    }

    // Clear persisted data
    localStorage.removeItem(STORAGE_KEY);

    if (taskMap.size > 0) {
      set({ uploads: Array.from(taskMap.values()), isVisible: true });
    }
  },
}));
