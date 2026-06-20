"use client";

import { useState, useEffect } from "react";
import { sharesApi } from "@/lib/api";
import { Copy, Check, Trash2, ExternalLink, Lock, Clock, X, Share2 } from "lucide-react";

interface Share {
  id: string;
  token: string;
  expiresAt: string | null;
  views: number;
  createdAt: string;
}

interface ShareDialogProps {
  fileId: string;
  fileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ fileId, fileName, open, onOpenChange }: ShareDialogProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState<string>("");
  const [usePassword, setUsePassword] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) loadShares();
  }, [open, fileId]);

  const loadShares = async () => {
    setLoading(true);
    try {
      const res = await sharesApi.getByFileId(fileId);
      setShares(res.data.data || []);
    } catch {
      setShares([]);
    } finally {
      setLoading(false);
    }
  };

  const createShare = async () => {
    setCreating(true);
    try {
      const options: { password?: string; expiresIn?: number } = {};
      if (usePassword && password) options.password = password;
      if (expiresIn) options.expiresIn = parseInt(expiresIn);
      await sharesApi.create(fileId, options);
      await loadShares();
      setPassword("");
      setExpiresIn("");
      setUsePassword(false);
    } catch (err) {
      console.error("Failed to create share:", err);
    } finally {
      setCreating(false);
    }
  };

  const deleteShare = async (id: string) => {
    try {
      await sharesApi.delete(id);
      setShares(shares.filter((s) => s.id !== id));
    } catch {}
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => onOpenChange(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 bg-canvas-card border border-hairline rounded-sm w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-body-mid" />
            <span className="text-sm text-ink truncate max-w-[200px]">Share "{fileName}"</span>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded-sm hover:bg-canvas-mid transition-colors">
            <X className="w-4 h-4 text-body-mid" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Create new share */}
          <div className="space-y-3 p-4 border border-hairline rounded-sm bg-canvas-soft">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={usePassword} onChange={(e) => setUsePassword(e.target.checked)} className="accent-ink" />
              <Lock className="w-3.5 h-3.5 text-body-mid" />
              <span className="text-xs text-body">Password protect</span>
            </label>
            {usePassword && (
              <input type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-xai text-sm" />
            )}
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-body-mid shrink-0" />
              <select value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)} className="input-xai text-sm py-2">
                <option value="">Never expires</option>
                <option value="3600">1 hour</option>
                <option value="86400">24 hours</option>
                <option value="604800">7 days</option>
                <option value="2592000">30 days</option>
              </select>
            </div>
            <button onClick={createShare} disabled={creating} className="btn-pill-primary w-full text-xs h-9">
              {creating ? "Creating..." : "Create Share Link"}
            </button>
          </div>

          {/* Existing shares */}
          {loading ? (
            <div className="text-center text-xs text-body-mid py-4">Loading...</div>
          ) : shares.length === 0 ? (
            <div className="text-center text-xs text-body-mid py-4">No share links yet</div>
          ) : (
            <div className="space-y-2">
              <span className="eyebrow-mono-sm">Active Links</span>
              {shares.map((share) => (
                <div key={share.id} className="flex items-center gap-2 px-3 py-2.5 border border-hairline rounded-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <ExternalLink className="w-3 h-3 text-body-mid shrink-0" />
                      <span className="text-xs text-ink truncate">/share/{share.token.slice(0, 12)}...</span>
                    </div>
                    <div className="text-xs text-body-mid mt-0.5">
                      {share.views} view{share.views !== 1 ? "s" : ""}
                      {share.expiresAt && <> · Expires {new Date(share.expiresAt).toLocaleDateString()}</>}
                    </div>
                  </div>
                  <button onClick={() => copyLink(share.token)} className="p-1.5 rounded-sm hover:bg-canvas-mid transition-colors">
                    {copiedId === share.token ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-body-mid" />}
                  </button>
                  <button onClick={() => deleteShare(share.id)} className="p-1.5 rounded-sm hover:bg-canvas-mid transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-body-mid" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
