"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { publicSharesApi } from "@/lib/publicApi";
import { formatFileSize } from "@/lib/fileTypes";
import { Download, Lock, FileX } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

interface ShareData {
  file: { id: string; originalName: string; mimeType: string; size: number };
  expiresAt: string | null;
  requiresPassword: boolean;
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);

  useEffect(() => { loadShare(); }, [token]);

  const loadShare = async (pwd?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await publicSharesApi.get(token, pwd);
      setShareData(res.data.data);
      setNeedsPassword(false);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Share not found";
      if (msg === "Password required") setNeedsPassword(true);
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const url = publicSharesApi.streamUrl(token, needsPassword ? password : undefined);
    window.open(url.replace("/stream", "/download"), "_blank");
  };

  const isPreviewable = shareData?.file.mimeType.startsWith("image/") ||
    shareData?.file.mimeType.startsWith("video/") ||
    shareData?.file.mimeType.startsWith("audio/") ||
    shareData?.file.mimeType === "application/pdf";

  const streamUrl = shareData ? publicSharesApi.streamUrl(token, needsPassword ? password : undefined) : "";

  if (loading && !needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="w-6 h-6 border-2 border-hairline border-t-ink rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-canvas-soft border border-hairline flex items-center justify-center mx-auto">
            <FileX className="w-6 h-6 text-body-mid" />
          </div>
          <h1 className="text-lg text-ink">Share Not Available</h1>
          <p className="text-sm text-body-mid">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="border-b border-hairline">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <BrandMark className="h-7 w-7 rounded-full" priority />
          <span className="text-sm text-ink">NexxCloud</span>
          <span className="text-xs text-body-mid">Shared File</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {needsPassword ? (
          <div className="max-w-sm mx-auto space-y-6">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-canvas-soft border border-hairline flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6 text-body-mid" />
              </div>
              <h1 className="text-lg text-ink">Password Protected</h1>
              <p className="text-sm text-body-mid">This share requires a password to access.</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); loadShare(password); }} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs text-body-mid">Password</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter share password" className="input-xai text-sm" autoFocus />
              </div>
              <button type="submit" className="btn-pill-primary w-full h-10">Access File</button>
            </form>
          </div>
        ) : shareData ? (
          <div className="space-y-6">
            {/* File info */}
            <div className="bg-canvas-card border border-hairline rounded-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-lg text-ink break-all">{shareData.file.originalName}</h1>
                  <p className="text-xs text-body-mid mt-1 font-mono">
                    {formatFileSize(shareData.file.size)} · {shareData.file.mimeType}
                  </p>
                </div>
                <button onClick={handleDownload} className="btn-pill-primary shrink-0">
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
              {shareData.expiresAt && (
                <p className="text-xs text-body-mid">Expires {new Date(shareData.expiresAt).toLocaleString()}</p>
              )}
            </div>

            {/* Preview */}
            {isPreviewable && (
              <div className="border border-hairline rounded-sm overflow-hidden bg-canvas">
                {shareData.file.mimeType.startsWith("image/") && (
                  <img src={streamUrl} alt={shareData.file.originalName} className="max-w-full max-h-[70vh] mx-auto object-contain" />
                )}
                {shareData.file.mimeType.startsWith("video/") && (
                  <video controls className="w-full max-h-[70vh] object-contain">
                    <source src={streamUrl} type={shareData.file.mimeType} />
                  </video>
                )}
                {shareData.file.mimeType.startsWith("audio/") && (
                  <div className="p-8">
                    <audio controls className="w-full"><source src={streamUrl} type={shareData.file.mimeType} /></audio>
                  </div>
                )}
                {shareData.file.mimeType === "application/pdf" && (
                  <iframe src={streamUrl} className="w-full h-[70vh] border-0" title={shareData.file.originalName} />
                )}
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
