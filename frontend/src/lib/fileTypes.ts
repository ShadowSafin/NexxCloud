import {
  FileText, Image, Music, Video, File, Archive, Code, Binary,
  Type, Box, PenTool, Database, BookOpen, Table, Presentation, HardDrive,
  LucideIcon,
} from "lucide-react";

export type FileCategory =
  | "images" | "videos" | "audio" | "documents" | "archives" | "code"
  | "executables" | "fonts" | "3d-models" | "cad" | "datasets"
  | "ebooks" | "spreadsheets" | "presentations" | "databases" | "unknown";

export interface FileTypeInfo {
  category: FileCategory;
  icon: LucideIcon;
  label: string;
  canPreview: boolean;
}

const CATEGORY_MAP: Record<FileCategory, FileTypeInfo> = {
  images:       { category: "images",       icon: Image,        label: "Image",       canPreview: true },
  videos:       { category: "videos",       icon: Video,        label: "Video",       canPreview: true },
  audio:        { category: "audio",        icon: Music,        label: "Audio",       canPreview: true },
  documents:    { category: "documents",    icon: FileText,     label: "Document",    canPreview: true },
  archives:     { category: "archives",     icon: Archive,      label: "Archive",     canPreview: false },
  code:         { category: "code",         icon: Code,         label: "Code",        canPreview: true },
  executables:  { category: "executables",  icon: Binary,       label: "Executable",  canPreview: false },
  fonts:        { category: "fonts",        icon: Type,         label: "Font",        canPreview: false },
  "3d-models":  { category: "3d-models",    icon: Box,          label: "3D Model",    canPreview: true },
  cad:          { category: "cad",          icon: PenTool,      label: "CAD",         canPreview: false },
  datasets:     { category: "datasets",     icon: Database,     label: "Dataset",     canPreview: true },
  ebooks:       { category: "ebooks",       icon: BookOpen,     label: "Ebook",       canPreview: true },
  spreadsheets: { category: "spreadsheets", icon: Table,        label: "Spreadsheet", canPreview: true },
  presentations:{ category: "presentations",icon: Presentation, label: "Presentation",canPreview: true },
  databases:    { category: "databases",    icon: HardDrive,    label: "Database",    canPreview: false },
  unknown:      { category: "unknown",      icon: File,         label: "File",        canPreview: false },
};

export function getFileTypeInfo(category: string): FileTypeInfo {
  const cat = (category?.toLowerCase() as FileCategory) || "unknown";
  return CATEGORY_MAP[cat] || CATEGORY_MAP.unknown;
}

export function canPreviewFile(category: string): boolean {
  return getFileTypeInfo(category).canPreview;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

export function getCategoryFromMime(mimeType: string, filename: string): FileCategory {
  const ext = getFileExtension(filename);
  const lowerMime = mimeType.toLowerCase();

  if (lowerMime.startsWith("image/")) return "images";
  if (lowerMime.startsWith("video/")) return "videos";
  if (lowerMime.startsWith("audio/")) return "audio";
  if (lowerMime.includes("pdf") || lowerMime.includes("text") || lowerMime.includes("document")) return "documents";
  if (lowerMime.includes("zip") || lowerMime.includes("rar") || lowerMime.includes("7z") || lowerMime.includes("tar") || lowerMime.includes("archive")) return "archives";
  if (lowerMime.includes("javascript") || lowerMime.includes("python") || lowerMime.includes("java") || lowerMime.includes("code")) return "code";
  if (lowerMime.includes("font")) return "fonts";
  if (lowerMime.includes("gltf") || lowerMime.includes("model") || ext === "obj" || ext === "stl" || ext === "blend") return "3d-models";
  if (lowerMime.includes("spreadsheet") || ext === "xlsx" || ext === "xls" || ext === "csv" || ext === "ods") return "spreadsheets";
  if (lowerMime.includes("presentation") || ext === "ppt" || ext === "pptx" || ext === "odp") return "presentations";
  if (lowerMime.includes("ebook") || ext === "epub" || ext === "mobi" || ext === "azw") return "ebooks";
  if (lowerMime.includes("dataset") || ext === "parquet" || ext === "h5") return "datasets";
  if (ext === "dwg" || ext === "dxf") return "cad";
  if (ext === "sql" || ext === "sqlite" || ext === "db") return "databases";

  return "unknown";
}
