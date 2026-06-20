import { prisma } from "../db";
import { cacheGet, cacheSet, getCacheClient } from "../lib/redis";

const CACHE_TTL = 300;
const RECENT_SEARCHES_KEY_PREFIX = "search:recent:";
const SEARCH_CACHE_KEY_PREFIX = "search:cache:";
const MAX_RECENT_SEARCHES = 20;

export interface SearchOptions {
  category?: string;
  mimeType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sizeMin?: number;
  sizeMax?: number;
  isFavorite?: boolean;
  isStarred?: boolean;
  isDeleted?: boolean;
  sortBy?: "name" | "size" | "createdAt" | "updatedAt" | "category";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
  folderId?: string;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

export interface CombinedSearchResult {
  files: SearchResult<FileSearchResult>;
  folders: SearchResult<FolderSearchResult>;
  total: number;
  hasMore: boolean;
}

export interface FileSearchResult {
  id: string;
  originalName: string;
  storedName: string;
  path: string;
  mimeType: string;
  category: string;
  size: number;
  isFavorite: boolean;
  isStarred: boolean;
  createdAt: Date;
  updatedAt: Date;
  folderId: string | null;
  metadata: Record<string, unknown> | null;
}

export interface FolderSearchResult {
  id: string;
  name: string;
  path: string | null;
  createdAt: Date;
  updatedAt: Date;
  parentId: string | null;
}

export class SearchService {
  async search(
    userId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<CombinedSearchResult> {
    const cacheKey = this.buildCacheKey(userId, query, options);
    const cached = await cacheGet<CombinedSearchResult>(cacheKey);
    if (cached) return cached;

    const [fileResult, folderResult] = await Promise.all([
      this.searchFiles(userId, query, options),
      this.searchFolders(userId, query, options),
    ]);

    const result: CombinedSearchResult = {
      files: fileResult,
      folders: folderResult,
      total: fileResult.total + folderResult.total,
      hasMore: fileResult.hasMore || folderResult.hasMore,
    };

    await cacheSet(cacheKey, result, CACHE_TTL);
    return result;
  }

  async searchFiles(
    userId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult<FileSearchResult>> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const isDeleted = options.isDeleted ?? false;

    const whereClause = this.buildFileWhere(userId, query, options, isDeleted);
    const orderBy = this.buildOrderBy(options);

    try {
      const [items, total] = await Promise.all([
        prisma.file.findMany({
          where: whereClause,
          orderBy,
          take: limit + 1,
          skip: offset,
        }),
        prisma.file.count({
          where: whereClause,
        }),
      ]);

      const hasMore = items.length > limit;
      if (hasMore) items.pop();

      return {
        items: items.map(this.mapToFileResult),
        total,
        hasMore,
      };
    } catch (error) {
      console.error("SearchService.searchFiles error:", error);
      throw new Error("Failed to search files");
    }
  }

  async searchFolders(
    userId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult<FolderSearchResult>> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const isDeleted = options.isDeleted ?? false;

    const whereClause = this.buildFolderWhere(userId, query, options, isDeleted);
    const orderBy = this.buildFolderOrderBy(options);

    try {
      const [items, total] = await Promise.all([
        prisma.folder.findMany({
          where: whereClause,
          orderBy,
          take: limit + 1,
          skip: offset,
        }),
        prisma.folder.count({
          where: whereClause,
        }),
      ]);

      const hasMore = items.length > limit;
      if (hasMore) items.pop();

      return {
        items: items.map(this.mapToFolderResult),
        total,
        hasMore,
      };
    } catch (error) {
      console.error("SearchService.searchFolders error:", error);
      throw new Error("Failed to search folders");
    }
  }

  async getRecentSearches(userId: string, limit: number = 10): Promise<string[]> {
    try {
      const key = `${RECENT_SEARCHES_KEY_PREFIX}${userId}`;
      const data = await getCacheClient().lrange(key, 0, limit - 1);
      return data;
    } catch (error) {
      console.error("SearchService.getRecentSearches error:", error);
      return [];
    }
  }

  async saveSearch(userId: string, query: string): Promise<void> {
    if (!query || !query.trim()) return;

    try {
      const key = `${RECENT_SEARCHES_KEY_PREFIX}${userId}`;
      const trimmed = query.trim();

      await getCacheClient().lrem(key, 0, trimmed);
      await getCacheClient().lpush(key, trimmed);
      await getCacheClient().ltrim(key, 0, MAX_RECENT_SEARCHES - 1);
      await getCacheClient().expire(key, 86400 * 7);
    } catch (error) {
      console.error("SearchService.saveSearch error:", error);
    }
  }

  async clearSearchCache(userId: string): Promise<void> {
    try {
      const pattern = `${SEARCH_CACHE_KEY_PREFIX}${userId}:*`;
      const keys = await getCacheClient().keys(pattern);
      if (keys.length > 0) {
        await getCacheClient().del(...keys);
      }
      const recentKey = `${RECENT_SEARCHES_KEY_PREFIX}${userId}`;
      await getCacheClient().del(recentKey);
    } catch (error) {
      console.error("SearchService.clearSearchCache error:", error);
    }
  }

  private buildFileWhere(
    userId: string,
    query: string,
    options: SearchOptions,
    isDeleted: boolean
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {
      userId,
      deletedAt: isDeleted ? { not: null } : null,
    };

    if (options.folderId) {
      where.folderId = options.folderId;
    }

    if (query) {
      where.OR = [
        { originalName: { contains: query, mode: "insensitive" } },
        { extension: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
        { mimeType: { contains: query, mode: "insensitive" } },
        { metadata: { path: ["name"], string_contains: query } },
        { metadata: { path: ["title"], string_contains: query } },
        { metadata: { path: ["description"], string_contains: query } },
        { metadata: { path: ["tags"], array_contains: [query] } },
      ];
    }

    if (options.category) {
      where.category = options.category;
    }

    if (options.mimeType) {
      where.mimeType = options.mimeType;
    }

    if (options.dateFrom || options.dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (options.dateFrom) dateFilter.gte = options.dateFrom;
      if (options.dateTo) dateFilter.lte = options.dateTo;
      where.createdAt = dateFilter;
    }

    if (options.sizeMin !== undefined || options.sizeMax !== undefined) {
      const sizeFilter: Record<string, number> = {};
      if (options.sizeMin !== undefined) sizeFilter.gte = options.sizeMin;
      if (options.sizeMax !== undefined) sizeFilter.lte = options.sizeMax;
      where.size = sizeFilter;
    }

    if (options.isFavorite !== undefined) {
      where.isFavorite = options.isFavorite;
    }

    if (options.isStarred !== undefined) {
      where.isStarred = options.isStarred;
    }

    return where;
  }

  private buildFolderWhere(
    userId: string,
    query: string,
    options: SearchOptions,
    isDeleted: boolean
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {
      userId,
      deletedAt: isDeleted ? { not: null } : null,
    };

    if (options.folderId) {
      where.parentId = options.folderId;
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
      ];
    }

    if (options.dateFrom || options.dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (options.dateFrom) dateFilter.gte = options.dateFrom;
      if (options.dateTo) dateFilter.lte = options.dateTo;
      where.createdAt = dateFilter;
    }

    return where;
  }

  private buildOrderBy(options: SearchOptions): Record<string, unknown>[] {
    const sortBy = options.sortBy ?? "updatedAt";
    const sortOrder = options.sortOrder ?? "desc";

    const fieldMap: Record<string, string> = {
      name: "originalName",
      size: "size",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      category: "category",
    };

    const field = fieldMap[sortBy] ?? "updatedAt";

    return [{ [field]: sortOrder }];
  }

  private buildFolderOrderBy(options: SearchOptions): Record<string, unknown>[] {
    const sortBy = options.sortBy ?? "updatedAt";
    const sortOrder = options.sortOrder ?? "desc";

    const fieldMap: Record<string, string> = {
      name: "name",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    };

    const field = fieldMap[sortBy] ?? "updatedAt";

    return [{ [field]: sortOrder }];
  }

  private mapToFileResult(file: any): FileSearchResult {
    return {
      id: file.id,
      originalName: file.originalName,
      storedName: file.storedName,
      path: file.path,
      mimeType: file.mimeType,
      category: file.category,
      size: Number(file.size),
      isFavorite: file.isFavorite,
      isStarred: file.isStarred,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      folderId: file.folderId,
      metadata: file.metadata as Record<string, unknown> | null,
    };
  }

  private mapToFolderResult(folder: any): FolderSearchResult {
    return {
      id: folder.id,
      name: folder.name,
      path: folder.path,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      parentId: folder.parentId,
    };
  }

  private buildCacheKey(
    userId: string,
    query: string,
    options: SearchOptions
  ): string {
    const sortedOptions = Object.keys(options)
      .sort()
      .reduce((acc, key) => {
        const value = options[key as keyof SearchOptions];
        if (value !== undefined) {
          acc[key] = value instanceof Date ? value.toISOString() : value;
        }
        return acc;
      }, {} as Record<string, unknown>);

    const optionsStr = JSON.stringify(sortedOptions);
    const hash = this.simpleHash(`${userId}:${query}:${optionsStr}`);
    return `${SEARCH_CACHE_KEY_PREFIX}${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

export const searchService = new SearchService();
