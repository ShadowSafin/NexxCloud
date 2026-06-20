"use client";

import React, { ReactNode, useState, useEffect, useRef } from "react";
import { Sidebar } from "./sidebar";
import { WifiOff, RefreshCw } from "lucide-react";
import { resolveApiUrl } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const isOfflineRef = useRef(isOffline);

  useEffect(() => {
    isOfflineRef.current = isOffline;
  }, [isOffline]);

  const childrenArray = React.Children.toArray(children);
  
  let headerElement: ReactNode = null;
  let mainContent: ReactNode = null;

  // Network detection & Auto-reconnect
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return false;
      }
      try {
        const url = resolveApiUrl("/health");
        const res = await fetch(url, { method: "GET", cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data && data.name === "NexxCloud") {
            return true;
          }
        }
      } catch (e) {
        // ignore
      }
      return false;
    };

    const handleOnlineStatus = async () => {
      const ok = await checkConnection();
      setIsOffline(!ok);
    };

    const handleOfflineStatus = () => {
      setIsOffline(true);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnlineStatus);
      window.addEventListener("offline", handleOfflineStatus);
      
      // Run initial check
      checkConnection().then(ok => {
        setIsOffline(!ok);
      });
      
      // Poll connection in background when offline
      const interval = setInterval(async () => {
        if (isOfflineRef.current) {
          const ok = await checkConnection();
          if (ok) {
            setIsOffline(false);
          }
        }
      }, 5000);

      // Capacitor Network Plugin listener
      let networkListener: any = null;
      if ((window as any).Capacitor?.Plugins?.Network) {
        try {
          const Network = (window as any).Capacitor.Plugins.Network;
          Network.addListener("networkStatusChange", async (status: any) => {
            if (!status.connected) {
              setIsOffline(true);
            } else {
              const ok = await checkConnection();
              setIsOffline(!ok);
            }
          }).then((listener: any) => {
            networkListener = listener;
          });
        } catch (e) {
          console.error("Capacitor Network listener error:", e);
        }
      }

      return () => {
        window.removeEventListener("online", handleOnlineStatus);
        window.removeEventListener("offline", handleOfflineStatus);
        clearInterval(interval);
        if (networkListener) {
          networkListener.remove().catch(() => {});
        }
      };
    }
  }, []);

  const handleRetry = async () => {
    setIsReconnecting(true);
    // Wait a brief moment to feel intentional
    await new Promise(r => setTimeout(r, 600));
    
    // Check connection
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
      setIsReconnecting(false);
      return;
    }
    
    try {
      const url = resolveApiUrl("/health");
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data && data.name === "NexxCloud") {
          setIsOffline(false);
          setIsReconnecting(false);
          return;
        }
      }
    } catch (e) {
      // ignore
    }
    setIsOffline(true);
    setIsReconnecting(false);
  };

  // Capacitor integrations
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Capacitor) {
      try {
        const { SplashScreen, App } = (window as any).Capacitor.Plugins;
        
        // Hide splash screen after bridge is ready
        if (SplashScreen) {
          setTimeout(() => {
            SplashScreen.hide().catch(() => {});
          }, 400);
        }

        // Handle Android hardware back button
        if (App) {
          App.addListener("backButton", () => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              App.exitApp();
            }
          });
        }
      } catch (e) {
        console.error("Capacitor shell init error:", e);
      }
    }
  }, []);

  if (childrenArray.length > 1) {
    const firstChild = childrenArray[0];
    if (React.isValidElement(firstChild)) {
      headerElement = React.cloneElement(firstChild as React.ReactElement<any>, {
        onToggleSidebar: () => setSidebarOpen(prev => !prev),
      });
    } else {
      headerElement = firstChild;
    }
    mainContent = childrenArray.slice(1);
  } else {
    mainContent = childrenArray[0];
  }

  return (
    <div className="relative flex h-[100dvh] min-h-screen w-full max-w-full flex-col overflow-hidden bg-[#04020a]">
      {/* Background Gradients & Grid Pattern */}
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="absolute top-[-10%] left-[20%] w-[700px] h-[700px] rounded-full bg-purple-900/10 blur-[150px] pointer-events-none animate-pulse-glow md:block hidden" />
      <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-cyan-950/15 blur-[130px] pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[500px] h-[500px] rounded-full bg-indigo-950/10 blur-[120px] pointer-events-none" />

      {/* Full-height app layout */}
      <div className="flex flex-col flex-1 overflow-hidden relative z-10">
        {/* Header at the top */}
        {headerElement && (
          <div className="w-full shrink-0 relative z-20">
            {headerElement}
          </div>
        )}

        {/* Sidebar + Main content split */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden overflow-x-hidden min-h-0 bg-black/10">
            {mainContent}
          </div>
        </div>
      </div>

      {isOffline && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#04020a]/80 backdrop-blur-lg animate-fade-in">
          <div className="relative w-full max-w-sm mx-4 bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-8 shadow-2xl text-center flex flex-col items-center gap-6">
            <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-b from-red-500/10 to-transparent blur-xl" />
            
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center shadow-lg shadow-red-500/10 relative overflow-hidden animate-pulse">
              <WifiOff className="w-8 h-8 text-red-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Connection Lost</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Could not reach the NexxCloud server. Please check your Wi-Fi connection and ensure the server is running.
              </p>
            </div>

            <button
              onClick={handleRetry}
              disabled={isReconnecting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-200 text-sm font-semibold transition-all duration-300 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isReconnecting ? "animate-spin" : ""}`} />
              <span>{isReconnecting ? "Reconnecting..." : "Retry Connection"}</span>
            </button>
            
            <div className="text-[10px] text-slate-500">
              Retrying automatically in the background...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
