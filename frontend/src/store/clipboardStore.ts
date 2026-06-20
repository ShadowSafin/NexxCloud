import { create } from "zustand";
import { filesApi, foldersApi, filesApiMove, filesApiCopy } from "../lib/api";

export type ClipboardAction = "copy" | "cut";

export interface ClipboardItem {
  id: string;
  type: "file" | "folder";
  name: string;
}

interface ClipboardStore {
  items: ClipboardItem[];
  action: ClipboardAction | null;
  sourceFolderId: string | null;

  // Actions
  copy: (items: ClipboardItem[], sourceFolderId: string | null) => void;
  cut: (items: ClipboardItem[], sourceFolderId: string | null) => void;
  paste: (targetFolderId: string | null) => Promise<{ success: number; failed: number }>;
  clear: () => void;
  hasClipboard: () => boolean;
}

export const useClipboardStore = create<ClipboardStore>((set, get) => ({
  items: [],
  action: null,
  sourceFolderId: null,

  copy: (items, sourceFolderId) => {
    set({ items, action: "copy", sourceFolderId });
  },

  cut: (items, sourceFolderId) => {
    set({ items, action: "cut", sourceFolderId });
  },

  paste: async (targetFolderId) => {
    const { items, action } = get();
    if (!action || items.length === 0) return { success: 0, failed: 0 };

    let success = 0;
    let failed = 0;

    for (const item of items) {
      try {
        if (item.type === "file") {
          if (action === "copy") {
            await filesApiCopy(item.id, targetFolderId);
          } else {
            await filesApiMove(item.id, targetFolderId);
          }
        } else if (item.type === "folder") {
          if (action === "copy") {
            await foldersApi.copy(item.id, targetFolderId);
          } else {
            await foldersApi.move(item.id, targetFolderId);
          }
        }
        success++;
      } catch (e) {
        console.error(`Failed to ${action} ${item.name}:`, e);
        failed++;
      }
    }

    // Clear clipboard after cut
    if (action === "cut") {
      set({ items: [], action: null, sourceFolderId: null });
    }

    return { success, failed };
  },

  clear: () => {
    set({ items: [], action: null, sourceFolderId: null });
  },

  hasClipboard: () => {
    const { items, action } = get();
    return items.length > 0 && action !== null;
  },
}));
