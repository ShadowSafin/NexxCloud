"use client";

import { useCallback, useState } from "react";
import { useUploadStore } from "@/store/uploadStore";
import { cn, formatFileSize } from "@/lib/utils";
import { Upload, X, File } from "lucide-react";

interface UploadDropzoneProps {
  isOpen: boolean;
  onClose: () => void;
  folderId?: string | null;
}

export function UploadDropzone({ isOpen, onClose, folderId }: UploadDropzoneProps) {
  const { addUpload } = useUploadStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles((prev) => [...prev, ...files]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);

    // Close dropzone immediately, uploads show in queue panel
    const filesToUpload = [...selectedFiles];
    setSelectedFiles([]);
    onClose();

    for (const file of filesToUpload) {
      addUpload(file, folderId || undefined);
    }

    setIsUploading(false);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 bg-canvas-card border border-hairline rounded-sm w-full max-w-lg animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <span className="text-sm text-ink">Upload Files</span>
          <button onClick={onClose} className="p-1 rounded-sm hover:bg-canvas-mid transition-colors">
            <X className="w-4 h-4 text-body-mid" />
          </button>
        </div>

        {/* Drop zone */}
        <div
          className={cn(
            "m-5 rounded-sm border border-dashed p-8 transition-colors",
            isDragOver
              ? "border-ink bg-canvas-soft"
              : "border-hairline hover:border-body-mid"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-canvas-soft border border-hairline flex items-center justify-center">
              <Upload className="w-5 h-5 text-body-mid" />
            </div>
            <div>
              <p className="text-sm text-ink">Drag and drop files here</p>
              <p className="text-xs text-body-mid mt-1">or click to browse</p>
            </div>
            <input type="file" multiple className="hidden" id="file-input" onChange={handleFileSelect} />
            <button
              className="btn-pill text-xs"
              onClick={() => document.getElementById("file-input")?.click()}
            >
              Choose Files
            </button>
          </div>
        </div>

        {/* Selected files */}
        {selectedFiles.length > 0 && (
          <div className="px-5 pb-3">
            <p className="text-xs text-body-mid mb-2">{selectedFiles.length} file(s) selected</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-3 px-3 py-2 rounded-sm bg-canvas-soft">
                  <File className="w-3.5 h-3.5 text-body-mid shrink-0" />
                  <span className="text-sm text-ink flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-body-mid font-mono">{formatFileSize(file.size)}</span>
                  <button onClick={() => removeFile(index)} className="p-0.5 rounded-sm hover:bg-canvas-mid">
                    <X className="w-3 h-3 text-body-mid" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-hairline">
          <button className="btn-pill text-xs h-9" onClick={onClose}>Cancel</button>
          <button
            className="btn-pill-primary text-xs h-9"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading}
          >
            {isUploading ? "Starting..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
