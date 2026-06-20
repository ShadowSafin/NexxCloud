"use client";

import { useState, useEffect, useRef } from "react";
import { FileItem } from "@/store/fileStore";
import { getFileTypeInfo, formatFileSize } from "@/lib/fileTypes";
import { apiClient, mediaApi } from "@/lib/api";
import {
  X,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

function getLanguageFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    kt: "kotlin", swift: "swift", c: "c", cpp: "cpp", h: "c", hpp: "cpp",
    cs: "csharp", php: "php", sh: "bash", bash: "bash", zsh: "bash",
    sql: "sql", html: "html", css: "css", scss: "scss", less: "less",
    xml: "xml", yaml: "yaml", yml: "yaml", toml: "toml",
    md: "markdown", json: "json", graphql: "graphql",
  };
  return map[ext] || "";
}

interface PreviewModalProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  onShare?: (file: FileItem) => void;
}

export function PreviewModal({
  file,
  isOpen,
  onClose,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  onShare,
}: PreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [textContent, setTextContent] = useState<string>("");
  const [textLoading, setTextLoading] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");
  const [streamUrl, setStreamUrl] = useState<string>("");
  const [downloadUrl, setDownloadUrl] = useState<string>("");
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const fileTypeInfo = file ? getFileTypeInfo(file.category) : null;
  const isImage = file?.mimeType.startsWith("image/");
  const isVideo = file?.mimeType.startsWith("video/");
  const isAudio = file?.mimeType.startsWith("audio/");
  const isPdf = file?.mimeType === "application/pdf";
  const isMarkdown = file?.mimeType === "text/markdown" || file?.originalName.endsWith(".md");
  const isJson = file?.mimeType === "application/json" || file?.originalName.endsWith(".json");
  const isCode = file?.mimeType.startsWith("text/") && !isMarkdown;
  const isText = isCode || isMarkdown || isJson;

  useEffect(() => {
    let cancelled = false;

    setZoom(1);
    setTextContent("");
    setHighlightedHtml("");
    setStreamUrl("");
    setDownloadUrl("");
    setMediaLoading(Boolean(file && isOpen && !isText));
    setMediaError(false);

    if (file && isOpen) {
      mediaApi.sign(file.id, "stream")
        .then((res) => {
          if (!cancelled) setStreamUrl(res.data.data.url);
        })
        .catch(() => {
          if (!cancelled) {
            setMediaLoading(false);
            setMediaError(true);
          }
        });
      mediaApi.sign(file.id, "download")
        .then((res) => {
          if (!cancelled) setDownloadUrl(res.data.data.url);
        })
        .catch(() => {
          if (!cancelled) setDownloadUrl("");
        });
    }

    if (file && isText && isOpen) {
      setTextLoading(true);
      apiClient.get(`/files/${file.id}/stream`, { responseType: "text" })
        .then((res) => res.data as string)
        .then(async (text) => {
          setTextContent(text);
          if (isJson) {
            try { setTextContent(JSON.stringify(JSON.parse(text), null, 2)); } catch {}
          }
          try {
            const hljs = await import("highlight.js");
            const lang = getLanguageFromFilename(file.originalName);
            if (lang && hljs.default.getLanguage(lang)) {
              setHighlightedHtml(hljs.default.highlight(text, { language: lang }).value);
            } else if (!isMarkdown) {
              setHighlightedHtml(hljs.default.highlightAuto(text).value);
            }
          } catch {}
        })
        .catch(() => setTextContent("Failed to load file content"))
        .finally(() => setTextLoading(false));
    }

    if (file && isMarkdown && isOpen) {
      setTextLoading(true);
      apiClient.get(`/files/${file.id}/stream`, { responseType: "text" })
        .then((res) => res.data as string)
        .then((text) => setTextContent(text))
        .catch(() => setTextContent("Failed to load file content"))
        .finally(() => setTextLoading(false));
    }

    return () => {
      cancelled = true;
    };
  }, [file, isOpen, isText, isJson, isMarkdown]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " " && (isVideo || isAudio) && videoRef.current) {
        e.preventDefault();
        if (videoRef.current.paused) {
          void videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      }
      if (e.key === "ArrowRight" && isImage) onNext?.();
      if (e.key === "ArrowLeft" && isImage) onPrev?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isVideo, isAudio, isImage, onNext, onPrev, onClose]);

  if (!file || !isOpen) return null;

  const openDownload = () => {
    if (downloadUrl) window.open(downloadUrl);
  };

  const renderMediaLoading = () => (
    <div className="flex min-h-[240px] items-center justify-center bg-canvas">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-hairline border-t-cyan-300" />
    </div>
  );

  const renderMediaError = () => (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 bg-canvas px-6 text-center">
      <p className="text-sm text-ink">Preview could not be loaded</p>
      <p className="text-xs text-body-mid">Download the file or reopen the preview to retry.</p>
    </div>
  );

  const renderPreview = () => {
    if (isImage) {
      if (mediaError) return renderMediaError();
      if (!streamUrl) return renderMediaLoading();
      return (
        <div className="relative flex items-center justify-center overflow-hidden min-h-[200px] bg-canvas">
          <img
            src={streamUrl}
            alt={file.originalName}
            className="max-w-full max-h-[70vh] w-auto h-auto object-contain transition-transform"
            style={{ transform: `scale(${zoom})` }}
            onLoad={() => setMediaLoading(false)}
            onError={() => {
              setMediaLoading(false);
              setMediaError(true);
            }}
          />
          {mediaLoading && <div className="absolute inset-0">{renderMediaLoading()}</div>}
        </div>
      );
    }

    if (isVideo) {
      if (mediaError) return renderMediaError();
      if (!streamUrl) return renderMediaLoading();
      return (
        <div className="flex items-center justify-center bg-canvas" style={{ height: "70vh" }}>
          <video
            ref={videoRef}
            key={`${file.id}:${streamUrl}`}
            src={streamUrl}
            className="w-full h-full object-contain"
            controls
            preload="metadata"
            playsInline
            onLoadedMetadata={() => setMediaLoading(false)}
            onError={() => {
              setMediaLoading(false);
              setMediaError(true);
            }}
          />
        </div>
      );
    }

    if (isAudio) {
      if (mediaError) return renderMediaError();
      if (!streamUrl) return renderMediaLoading();
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-canvas w-full">
          <div className="w-20 h-20 rounded-full bg-canvas-soft border border-hairline flex items-center justify-center mb-6">
            <span className="text-3xl">🎵</span>
          </div>
          <p className="text-sm text-ink mb-6 truncate max-w-md">{file.originalName}</p>
          <audio
            ref={videoRef}
            key={`${file.id}:${streamUrl}`}
            src={streamUrl}
            controls
            className="w-full max-w-md"
            onLoadedMetadata={() => setMediaLoading(false)}
            onError={() => {
              setMediaLoading(false);
              setMediaError(true);
            }}
          />
        </div>
      );
    }

    if (isPdf) {
      if (mediaError) return renderMediaError();
      if (!streamUrl) return renderMediaLoading();
      return (
        <iframe
          src={streamUrl}
          className="w-full h-[70vh] border-0"
          title={file.originalName}
          onLoad={() => setMediaLoading(false)}
        />
      );
    }

    if (isText) {
      if (textLoading) {
        return (
          <div className="flex items-center justify-center p-12 bg-canvas">
            <div className="w-6 h-6 border-2 border-hairline border-t-ink rounded-full animate-spin" />
          </div>
        );
      }
      return (
        <div className="p-6 overflow-auto max-h-[70vh] bg-canvas">
          <pre className="text-sm whitespace-pre-wrap font-mono text-body leading-relaxed">
            {highlightedHtml ? (
              <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
            ) : (
              textContent
            )}
          </pre>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-12 bg-canvas">
        <div className="w-16 h-16 rounded-full bg-canvas-soft border border-hairline flex items-center justify-center mb-4">
          <Download className="w-6 h-6 text-body-mid" />
        </div>
        <p className="text-sm text-ink mb-1">{file.originalName}</p>
        <p className="text-xs text-body-mid mb-6">{formatFileSize(file.size)}</p>
        <button
          className="btn-pill-primary"
          onClick={openDownload}
        >
          <Download className="w-4 h-4" />
          Download
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-5xl max-h-[90vh] flex flex-col bg-canvas-card border border-hairline rounded-sm animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-hairline shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm text-ink truncate max-w-[240px]">{file.originalName}</span>
            <span className="text-xs text-body-mid font-mono">{formatFileSize(file.size)}</span>
          </div>
          <div className="flex items-center gap-1">
            {isImage && (
              <>
                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-1.5 rounded-sm hover:bg-canvas-mid transition-colors">
                  <ZoomOut className="w-4 h-4 text-body-mid" />
                </button>
                <span className="text-xs text-body-mid font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-1.5 rounded-sm hover:bg-canvas-mid transition-colors">
                  <ZoomIn className="w-4 h-4 text-body-mid" />
                </button>
              </>
            )}
            <button onClick={openDownload} className="p-1.5 rounded-sm hover:bg-canvas-mid transition-colors">
              <Download className="w-4 h-4 text-body-mid" />
            </button>
            {onShare && (
              <button onClick={() => onShare(file)} className="p-1.5 rounded-sm hover:bg-canvas-mid transition-colors">
                <Share2 className="w-4 h-4 text-body-mid" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-canvas-mid transition-colors">
              <X className="w-4 h-4 text-body-mid" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-hidden">
          {hasPrev && (
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-canvas-card/80 border border-hairline flex items-center justify-center hover:bg-canvas-soft transition-colors"
              onClick={onPrev}
            >
              <ChevronLeft className="w-5 h-5 text-ink" />
            </button>
          )}
          {hasNext && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-canvas-card/80 border border-hairline flex items-center justify-center hover:bg-canvas-soft transition-colors"
              onClick={onNext}
            >
              <ChevronRight className="w-5 h-5 text-ink" />
            </button>
          )}
          {renderPreview()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-hairline shrink-0">
          <span className="eyebrow-mono-sm">{fileTypeInfo?.label || file.mimeType}</span>
          <div className="flex items-center gap-2">
            <button
              className="btn-pill text-xs h-8"
              onClick={openDownload}
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
            {onShare && (
              <button className="btn-pill text-xs h-8" onClick={() => onShare(file)}>
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
