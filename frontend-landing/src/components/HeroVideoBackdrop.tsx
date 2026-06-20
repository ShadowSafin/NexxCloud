"use client";

import { useEffect, useState } from "react";

type ConnectionNavigator = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

export default function HeroVideoBackdrop() {
  const [canPlayVideo, setCanPlayVideo] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopViewport = window.matchMedia("(min-width: 768px)");
    const saveData = (navigator as ConnectionNavigator).connection?.saveData;
    let timeoutId: number | undefined;
    let idleId: number | undefined;

    const cancelScheduledLoad = () => {
      window.clearTimeout(timeoutId);
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };

    const scheduleVideo = () => {
      cancelScheduledLoad();
      if (reducedMotion.matches || !desktopViewport.matches || saveData) {
        setCanPlayVideo(false);
        return;
      }

      timeoutId = window.setTimeout(() => {
        if ("requestIdleCallback" in window) {
          idleId = window.requestIdleCallback(() => setCanPlayVideo(true), {
            timeout: 1500,
          });
        } else {
          setCanPlayVideo(true);
        }
      }, 2500);
    };

    scheduleVideo();
    reducedMotion.addEventListener("change", scheduleVideo);
    desktopViewport.addEventListener("change", scheduleVideo);

    return () => {
      cancelScheduledLoad();
      reducedMotion.removeEventListener("change", scheduleVideo);
      desktopViewport.removeEventListener("change", scheduleVideo);
    };
  }, []);

  if (!canPlayVideo) {
    return (
      <div
        aria-hidden="true"
        className="hero-video-fallback absolute inset-0 h-full w-full"
      />
    );
  }

  return (
    <video
      aria-hidden="true"
      className="hero-video-layer absolute inset-0 h-full w-full object-cover object-center"
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      tabIndex={-1}
    >
      <source src="/hero-video.mp4" type="video/mp4" />
    </video>
  );
}
