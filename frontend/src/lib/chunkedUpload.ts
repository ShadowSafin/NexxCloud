import axios, { AxiosProgressEvent, AxiosRequestConfig } from "axios";
import { apiClient, resolveUploadApiBaseUrl } from "./api";

const MAX_CONCURRENT = 3;
const MAX_RETRIES = 8;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;
const MERGE_POLL_INTERVAL_MS = 1000;
const MAX_MERGE_WAIT_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_STATUS_POLL_FAILURES = 20;
const STORAGE_KEY = "nexxcloud-upload-queue";

let activeChunkUploads = 0;
const chunkUploadQueue: Array<() => void> = [];

export interface UploadSession {
  sessionId: string;
  chunkSize: number;
  totalChunks: number;
  filename: string;
  totalSize: number;
}

export interface UploadTask {
  id: string;
  file: File;
  sessionId: string;
  filename: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: Set<number>;
  failedChunks: Map<number, number>; // chunkIndex -> retryCount
  status: "pending" | "uploading" | "paused" | "merging" | "completed" | "failed" | "cancelled";
  progress: number;
  speed: number; // bytes per second
  error?: string;
  folderId?: string;
  startedAt?: number;
  completedAt?: number;
}

interface PersistedTask {
  id: string;
  sessionId: string;
  filename: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number[];
  status: string;
  folderId?: string;
}

// --- API helpers ---

function retryDelay(attempt: number): number {
  const exponential = Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * 2 ** attempt);
  return exponential + Math.floor(Math.random() * 500);
}

async function withChunkUploadSlot<T>(operation: () => Promise<T>): Promise<T> {
  if (activeChunkUploads >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => chunkUploadQueue.push(resolve));
  }

  activeChunkUploads++;
  try {
    return await operation();
  } finally {
    activeChunkUploads = Math.max(0, activeChunkUploads - 1);
    chunkUploadQueue.shift()?.();
  }
}

function uploadErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiMessage = (error.response?.data as { error?: string; message?: string } | undefined)?.error ||
      (error.response?.data as { error?: string; message?: string } | undefined)?.message;
    if (apiMessage) return apiMessage;

    if (!error.response) {
      return "Network timeout while uploading. NexxCloud will retry the missing chunks.";
    }
  }

  return error instanceof Error ? error.message : "Upload failed";
}

async function uploadRequestConfig(extra: AxiosRequestConfig = {}): Promise<AxiosRequestConfig> {
  return {
    ...extra,
    baseURL: await resolveUploadApiBaseUrl(),
    timeout: 0,
  };
}

export async function initiateUpload(
  filename: string,
  mimeType: string,
  totalSize: number,
  folderId?: string
): Promise<UploadSession> {
  const res = await apiClient.post("/uploads/initiate", {
    filename,
    mimeType,
    totalSize,
    folderId,
  }, await uploadRequestConfig());
  return res.data.data;
}

export async function uploadChunk(
  sessionId: string,
  chunkIndex: number,
  data: Blob,
  hash?: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  const formData = new FormData();
  formData.append("chunk", data);
  if (hash) formData.append("hash", hash);

  await apiClient.post(`/uploads/${sessionId}/chunk/${chunkIndex}`, formData, await uploadRequestConfig({
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e: AxiosProgressEvent) => {
      if (onProgress && e.total) onProgress(e.loaded, e.total);
    },
  }));
}

export async function completeUpload(sessionId: string): Promise<any> {
  const res = await apiClient.post(`/uploads/${sessionId}/complete`, undefined, await uploadRequestConfig());
  return res.data.data;
}

export async function cancelUpload(sessionId: string): Promise<void> {
  await apiClient.post(`/uploads/${sessionId}/cancel`, undefined, await uploadRequestConfig());
}

export async function getUploadStatus(sessionId: string): Promise<any> {
  const res = await apiClient.get(`/uploads/status/${sessionId}`, await uploadRequestConfig());
  return res.data.data;
}

export async function getResumeInfo(sessionId: string): Promise<any> {
  const res = await apiClient.get(`/uploads/${sessionId}/resume`, await uploadRequestConfig());
  return res.data.data;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForMergeCompletion(
  task: UploadTask,
  onProgress?: (task: UploadTask) => void
): Promise<void> {
  const startedAt = Date.now();
  let failedPolls = 0;

  while (task.status === "merging") {
    let status: any;
    try {
      status = await getUploadStatus(task.sessionId);
      failedPolls = 0;
    } catch (error) {
      failedPolls++;
      if (failedPolls > MAX_STATUS_POLL_FAILURES) {
        throw new Error(uploadErrorMessage(error));
      }
      await sleep(retryDelay(Math.min(failedPolls, MAX_RETRIES)));
      continue;
    }

    if (status.status === "completed") {
      task.status = "completed";
      task.progress = 1;
      task.completedAt = Date.now();
      onProgress?.(task);
      return;
    }

    if (status.status === "failed" || status.status === "cancelled") {
      throw new Error(`Upload ${status.status} while finalizing`);
    }

    if (Date.now() - startedAt > MAX_MERGE_WAIT_MS) {
      throw new Error("Upload finalization timed out");
    }

    task.progress = Math.max(task.progress, 0.99);
    onProgress?.(task);
    await sleep(MERGE_POLL_INTERVAL_MS);
  }
}

// --- Chunk hashing ---

async function computeChunkHash(data: Blob): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle?.digest) return "";

  try {
    const buffer = await data.arrayBuffer();
    const hashBuffer = await subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "";
  }
}

// --- Promise pool for concurrency control ---

async function promisePool<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array(Math.min(concurrency, tasks.length))
    .fill(null)
    .map(() => worker());
  await Promise.all(workers);
  return results;
}

// --- Persistence ---

export function loadPersistedTasks(): PersistedTask[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function clearPersistedTasks(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// --- Upload task management ---

export async function uploadFileChunked(
  file: File,
  folderId?: string,
  onProgress?: (task: UploadTask) => void,
  existingId?: string,
  existingTask?: UploadTask
): Promise<UploadTask> {
  // Initiate session
  const mimeType = file.type || "application/octet-stream";
  const session = await initiateUpload(file.name, mimeType, file.size, folderId);

  // Use existing task object if provided (shared reference with store)
  const task: UploadTask = existingTask || {
    id: existingId || `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    sessionId: session.sessionId,
    filename: file.name,
    totalSize: file.size,
    chunkSize: session.chunkSize,
    totalChunks: session.totalChunks,
    uploadedChunks: new Set(),
    failedChunks: new Map(),
    status: "uploading",
    progress: 0,
    speed: 0,
    folderId,
    startedAt: Date.now(),
  };

  // Update session info on the existing task
  task.sessionId = session.sessionId;
  task.chunkSize = session.chunkSize;
  task.totalChunks = session.totalChunks;

  // Start upload (don't await - let it run in background)
  runUpload(task, onProgress);
  return task;
}

export async function resumeUpload(
  persistedTask: PersistedTask,
  file: File,
  onProgress?: (task: UploadTask) => void
): Promise<UploadTask> {
  // Get current status from server
  const info = await getResumeInfo(persistedTask.sessionId);

  const task: UploadTask = {
    id: persistedTask.id,
    file,
    sessionId: persistedTask.sessionId,
    filename: persistedTask.filename,
    totalSize: persistedTask.totalSize,
    chunkSize: persistedTask.chunkSize,
    totalChunks: persistedTask.totalChunks,
    uploadedChunks: new Set(info.pendingChunks.length === 0 ? [] : persistedTask.uploadedChunks),
    failedChunks: new Map(),
    status: "uploading",
    progress: 0,
    speed: 0,
    folderId: persistedTask.folderId,
    startedAt: Date.now(),
  };

  // If all chunks are done, just complete
  if (info.pendingChunks.length === 0) {
    task.status = "merging";
    task.progress = 1;
    await completeUpload(task.sessionId);
    await waitForMergeCompletion(task, onProgress);
    return task;
  }

  // Resume uploading remaining chunks
  await runUpload(task, onProgress, info.pendingChunks);
  return task;
}

async function runUpload(
  task: UploadTask,
  onProgress?: (task: UploadTask) => void,
  pendingChunkIndices?: number[]
): Promise<void> {
  const chunksToUpload = pendingChunkIndices || [];
  if (chunksToUpload.length === 0) {
    for (let i = 0; i < task.totalChunks; i++) {
      if (!task.uploadedChunks.has(i)) chunksToUpload.push(i);
    }
  }

  let bytesUploaded = task.uploadedChunks.size * task.chunkSize;
  const startTime = Date.now();

  const markChunkUploaded = (chunkIndex: number, size: number) => {
    if (task.uploadedChunks.has(chunkIndex)) return;
    task.uploadedChunks.add(chunkIndex);
    task.failedChunks.delete(chunkIndex);
    bytesUploaded += size;

    const elapsed = (Date.now() - startTime) / 1000;
    task.speed = elapsed > 0 ? bytesUploaded / elapsed : 0;
    task.progress = task.uploadedChunks.size / task.totalChunks;
    onProgress?.(task);
  };

  const serverAlreadyHasChunk = async (chunkIndex: number): Promise<boolean> => {
    try {
      const status = await getUploadStatus(task.sessionId);
      return Boolean(status.chunks?.some((chunk: any) => chunk.chunkIndex === chunkIndex && chunk.uploaded));
    } catch {
      return false;
    }
  };

  const uploadSingleChunk = async (chunkIndex: number): Promise<void> => {
    if (task.status === "paused" || task.status === "cancelled") return;

    const start = chunkIndex * task.chunkSize;
    const end = Math.min(start + task.chunkSize, task.totalSize);
    const chunk = task.file.slice(start, end);
    const chunkSize = end - start;
    const hash = await computeChunkHash(chunk);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Re-check status before each attempt
        if ((task.status as string) === "paused" || (task.status as string) === "cancelled") return;

        await withChunkUploadSlot(() => uploadChunk(task.sessionId, chunkIndex, chunk, hash || undefined));
        markChunkUploaded(chunkIndex, chunkSize);
        return;
      } catch (err) {
        if (await serverAlreadyHasChunk(chunkIndex)) {
          markChunkUploaded(chunkIndex, chunkSize);
          return;
        }

        if (attempt === MAX_RETRIES - 1) {
          task.failedChunks.set(chunkIndex, MAX_RETRIES);
          throw new Error(uploadErrorMessage(err));
        }

        task.failedChunks.set(chunkIndex, attempt + 1);
        onProgress?.(task);
        await sleep(retryDelay(attempt));
      }
    }
  };

  try {
    await promisePool(
      chunksToUpload.map((idx) => () => uploadSingleChunk(idx)),
      MAX_CONCURRENT
    );

    if (task.status === "cancelled") return;

    // All chunks uploaded, complete
    task.status = "merging";
    onProgress?.(task);

    await completeUploadWithRetry(task.sessionId);
    await waitForMergeCompletion(task, onProgress);
  } catch (err: any) {
    if (task.status !== "paused" && task.status !== "cancelled") {
      task.status = "failed";
      task.error = uploadErrorMessage(err);
      onProgress?.(task);
    }
  }
}

async function completeUploadWithRetry(sessionId: string): Promise<void> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await completeUpload(sessionId);
      return;
    } catch (error) {
      try {
        const status = await getUploadStatus(sessionId);
        if (status.status === "merging" || status.status === "completed") return;
      } catch {}

      if (attempt === MAX_RETRIES - 1) throw new Error(uploadErrorMessage(error));
      await sleep(retryDelay(attempt));
    }
  }
}

export function pauseUploadTask(task: UploadTask): void {
  task.status = "paused";
}

export function cancelUploadTask(task: UploadTask): void {
  task.status = "cancelled";
  cancelUpload(task.sessionId).catch(() => {});
}

export function retryFailedChunks(
  task: UploadTask,
  onProgress?: (task: UploadTask) => void
): Promise<void> {
  const failedIndices = Array.from(task.failedChunks.keys());
  task.failedChunks.clear();
  task.status = "uploading";
  return runUpload(task, onProgress, failedIndices);
}

// Check if file should use chunked upload (>10MB)
export function shouldUseChunkedUpload(file: File): boolean {
  return file.size > 10 * 1024 * 1024;
}
