"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Calendar, HardDrive, Globe, QrCode, Copy, Check, Menu, ArrowLeft } from "lucide-react";
import { filesApi, apiClient } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import QRCode from "qrcode";
import { useAuthStore } from "@/store/authStore";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

interface SettingsHeaderProps {
  onToggleSidebar?: () => void;
}

function SettingsHeader({ onToggleSidebar }: SettingsHeaderProps) {
  const router = useRouter();
  return (
    <div className="h-14 border-b border-white/[0.06] bg-black/25 backdrop-blur-md flex items-center justify-between px-6 shrink-0 relative z-20 safe-pt">
      <div className="flex items-center gap-3">
        {/* Hamburger Menu on Mobile */}
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all md:hidden text-white/70 hover:text-white"
          aria-label="Toggle Menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        <span className="text-sm text-white/90 font-medium">Settings</span>
      </div>
      
      {/* Back to drive button */}
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] text-xs text-white/70 hover:text-white transition-all"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Drive</span>
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, hasHydrated } = useAuthStore();

  const [mounted, setMounted] = useState(false);

  const [storageUsed, setStorageUsed] = useState(0);
  const [storageAvailable, setStorageAvailable] = useState(0);
  const [storageTotal, setStorageTotal] = useState(0);
  const [fileCount, setFileCount] = useState(0);

  const [networkStatus, setNetworkStatus] = useState<any>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && hasHydrated && !authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, hasHydrated, authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      let isActive = true;
      const loadStorage = () => {
        filesApi.storage()
          .then((res) => {
            if (!isActive) return;
            const d = res.data.data;
            setStorageUsed(d.used);
            setStorageAvailable(d.availableDisk ?? d.freeDisk ?? 0);
            setStorageTotal(d.totalDisk ?? 0);
            setFileCount(d.fileCount);
          })
          .catch(() => {});
      };
      const refreshWhenVisible = () => {
        if (document.visibilityState === "visible") {
          loadStorage();
        }
      };

      loadStorage();
      const storageIntervalId = window.setInterval(loadStorage, 30_000);
      document.addEventListener("visibilitychange", refreshWhenVisible);

      apiClient.get("/network/status")
        .then((res) => {
          const netData = res.data.data;
          setNetworkStatus(netData);
          const primaryUrl = netData.urls[0] || `http://${window.location.hostname}:3000`;
          setQrUrl(primaryUrl);
          QRCode.toDataURL(primaryUrl, {
            width: 300,
            margin: 2,
            color: {
              dark: "#050510",
              light: "#ffffff"
            }
          }).then((dataUrl) => {
            setQrCodeDataUrl(dataUrl);
          }).catch(err => console.error("QR Code generation failed:", err));
        })
        .catch(() => {});

      return () => {
        isActive = false;
        window.clearInterval(storageIntervalId);
        document.removeEventListener("visibilitychange", refreshWhenVisible);
      };
    }
  }, [isAuthenticated]);

  const handleSelectQrUrl = (url: string) => {
    setQrUrl(url);
    QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: "#050510",
        light: "#ffffff"
      }
    }).then((dataUrl) => {
      setQrCodeDataUrl(dataUrl);
    }).catch(err => console.error("QR Code generation failed:", err));
  };

  if (!mounted || !hasHydrated || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-canvas">
        <div className="w-6 h-6 border-2 border-hairline border-t-ink rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const usableCapacity = storageUsed + storageAvailable;
  const usedPercent = usableCapacity > 0 ? Math.min((storageUsed / usableCapacity) * 100, 100) : 0;

  return (
    <AppShell>
      <SettingsHeader />

      <div className="flex-1 overflow-auto px-4 sm:px-6 py-6 sm:py-8 safe-pb">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <span className="eyebrow-mono">Settings</span>
            <h1 className="display-sm mt-2">Account & Preferences</h1>
          </div>

          {/* Profile */}
          <div className="bg-canvas-card border border-hairline rounded-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-4 h-4 text-body-mid" />
              <span className="text-sm text-ink">Profile</span>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-canvas-mid flex items-center justify-center">
                <span className="text-lg text-ink">{user.username.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-sm text-ink">{user.username}</p>
                <p className="text-xs text-body-mid">{user.email}</p>
              </div>
            </div>

            <div className="h-px bg-hairline mb-6" />

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <User className="w-3 h-3 text-body-mid" />
                  <span className="text-xs text-body-mid">Username</span>
                </div>
                <p className="text-sm text-ink">{user.username}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Mail className="w-3 h-3 text-body-mid" />
                  <span className="text-xs text-body-mid">Email</span>
                </div>
                <p className="text-sm text-ink">{user.email}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3 h-3 text-body-mid" />
                  <span className="text-xs text-body-mid">Member Since</span>
                </div>
                <p className="text-sm text-ink">
                  {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>
          </div>

          {/* Storage */}
          <div className="bg-canvas-card border border-hairline rounded-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <HardDrive className="w-4 h-4 text-body-mid" />
              <span className="text-sm text-ink">Storage</span>
            </div>

            {/* Usage bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-body-mid">NexxCloud usage</span>
                <span className="text-xs text-body-mid font-mono">{usedPercent.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-canvas-mid rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${usedPercent}%`,
                    background: usedPercent > 90 ? "#ef4444" : "#ff7a17",
                  }}
                />
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-canvas-soft border border-hairline rounded-sm">
                <p className="text-xs text-body-mid mb-1">Used</p>
                <p className="text-lg text-ink font-mono">{formatBytes(storageUsed)}</p>
              </div>
              <div className="p-4 bg-canvas-soft border border-hairline rounded-sm">
                <p className="text-xs text-body-mid mb-1">Available</p>
                <p className="text-lg text-ink font-mono">{formatBytes(storageAvailable)}</p>
              </div>
              <div className="p-4 bg-canvas-soft border border-hairline rounded-sm">
                <p className="text-xs text-body-mid mb-1">Total Disk</p>
                <p className="text-lg text-ink font-mono">{formatBytes(storageTotal)}</p>
              </div>
              <div className="p-4 bg-canvas-soft border border-hairline rounded-sm">
                <p className="text-xs text-body-mid mb-1">Files</p>
                <p className="text-lg text-ink font-mono">{fileCount}</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-body-mid">
              Available and total disk space are read directly from the configured storage volume.
            </p>
          </div>

          {/* Network Access (LAN) */}
          <div className="bg-canvas-card border border-hairline rounded-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Globe className="w-4 h-4 text-body-mid" />
              <span className="text-sm text-ink">Network Access (LAN)</span>
            </div>

            <p className="text-xs text-body-mid mb-6 leading-relaxed">
              NexxCloud is accessible to any device on your local network (LAN) such as phones, tablets, or smart TVs. Connect via the local hostname or IP addresses below.
            </p>

            {networkStatus ? (
              <div className="space-y-6">
                {/* URLs list */}
                <div className="space-y-3">
                  <span className="text-[11px] eyebrow-mono-sm font-semibold">Active Access URLs</span>
                  <div className="grid gap-3">
                    {networkStatus.urls.map((url: string, idx: number) => {
                      const isSelected = qrUrl === url;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-4 bg-canvas-soft border rounded-sm transition-all duration-300 ${
                            isSelected ? "border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]" : "border-hairline"
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-body-mid font-mono">
                              {url.includes(".local")
                                ? "mDNS Hostname"
                                : `IP Address (Adapter ${idx})`}
                            </span>
                            <span className="text-xs text-ink font-mono select-all font-semibold">
                              {url}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                handleSelectQrUrl(url);
                                setShowQrModal(true);
                              }}
                              className="p-2 rounded-sm border border-hairline bg-canvas-mid hover:bg-canvas-soft text-body-mid hover:text-ink transition-colors"
                              title="Show QR Code"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(url);
                                setCopiedUrl(url);
                                setTimeout(() => setCopiedUrl(null), 2000);
                              }}
                              className="p-2 rounded-sm border border-hairline bg-canvas-mid hover:bg-canvas-soft text-body-mid hover:text-ink transition-colors"
                              title="Copy URL"
                            >
                              {copiedUrl === url ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Network diagnostics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-canvas-soft border border-hairline rounded-sm">
                    <p className="text-[10px] text-body-mid mb-1">Primary LAN IP</p>
                    <p className="text-sm text-ink font-mono font-semibold">{networkStatus.primaryIp}</p>
                  </div>
                  <div className="p-4 bg-canvas-soft border border-hairline rounded-sm">
                    <p className="text-[10px] text-body-mid mb-1">mDNS Hostname</p>
                    <p className="text-sm text-ink font-mono font-semibold">{networkStatus.hostname}</p>
                  </div>
                </div>

                <div className="p-4 bg-canvas-soft border border-hairline rounded-sm flex items-center justify-between text-xs">
                  <span className="text-body-mid">Backend Server Port</span>
                  <span className="font-mono text-ink font-semibold">{networkStatus.port}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 bg-canvas-soft border border-hairline rounded-sm animate-pulse">
                <span className="text-xs text-body-mid">Detecting network configuration...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="relative w-full max-w-sm bg-canvas-card border border-white/[0.08] rounded-xl p-6 shadow-2xl glass-premium animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Scan to Connect</h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-white/40 hover:text-white/90 text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* QR Image */}
            <div className="flex flex-col items-center justify-center bg-white p-4 rounded-lg mb-6">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="NexxCloud Access QR Code"
                  className="w-48 h-48 select-none"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center border border-dashed border-gray-300">
                  <span className="text-xs text-gray-400">Loading...</span>
                </div>
              )}
            </div>

            {/* URL Label */}
            <div className="space-y-2 text-center">
              <p className="text-[10px] text-body-mid font-medium">Selected URL</p>
              <div className="flex items-center justify-center gap-2 p-3 bg-canvas-soft border border-hairline rounded-sm">
                <span className="text-xs text-ink font-mono select-all truncate max-w-[200px]">
                  {qrUrl}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(qrUrl);
                    setCopiedUrl(qrUrl);
                    setTimeout(() => setCopiedUrl(null), 2000);
                  }}
                  className="text-white/40 hover:text-white"
                >
                  {copiedUrl === qrUrl ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-body-mid leading-relaxed mt-2">
                Make sure your phone or tablet is connected to the same Wi-Fi network as the NexxCloud server.
              </p>
            </div>

            {/* Action button */}
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full mt-6 py-2.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-sm font-semibold transition-all duration-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
