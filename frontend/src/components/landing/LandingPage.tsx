"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Github, PlayCircle, ShieldCheck, Server, Zap } from "lucide-react";
import { AmbientBackground } from "./Background";
import { Nav } from "./Nav";
import { DashboardMock } from "./DashboardMock";
import {
  Features, SelfHost, HowItWorks, Performance, Collaboration,
  AISection, DevSection, Testimonials, Pricing, FAQ, FinalCTA, Footer,
} from "./Sections";

export function LandingPage() {
  const isMobileShell = useMobileShell();

  return (
    <div className={`apex-root apex-body relative min-h-screen overflow-x-clip font-sans antialiased${isMobileShell ? " apex-mobile-shell" : ""}`}>
      <AmbientBackground />
      <Nav stableCompositing={isMobileShell} />
      <main>
        <Hero isMobileShell={isMobileShell} />
        <Marquee />
        <Features />
        <SelfHost />
        <HowItWorks />
        <Performance />
        <Collaboration />
        <AISection />
        <DevSection />
        <Testimonials />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

function Hero({ isMobileShell }: { isMobileShell: boolean }) {
  const heroRef = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = Boolean(useReducedMotion());
  const stabilizeVideoLayer = shouldReduceMotion || isMobileShell;
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const cinematicProgress = useSpring(scrollYProgress, {
    stiffness: 72,
    damping: 28,
    mass: 0.35,
  });

  const glowY = useTransform(cinematicProgress, [0, 1], stabilizeVideoLayer ? ["0%", "0%"] : ["0%", "5%"]);
  const glowOpacity = useTransform(cinematicProgress, [0, 0.75, 1], [0.75, 0.5, 0.18]);
  const videoY = useTransform(cinematicProgress, [0, 1], stabilizeVideoLayer ? ["0%", "0%"] : ["0%", "12%"]);
  const videoScale = useTransform(cinematicProgress, [0, 1], stabilizeVideoLayer ? [1.05, 1.05] : [1.08, 1.22]);
  const videoOpacity = useTransform(cinematicProgress, [0, 0.72, 1], stabilizeVideoLayer ? [0.92, 0.92, 0.86] : [0.95, 0.74, 0.2]);
  const overlayOpacity = useTransform(cinematicProgress, [0, 1], [0.62, 0.9]);
  const textY = useTransform(cinematicProgress, [0, 0.18, 0.32], stabilizeVideoLayer ? [0, 0, 0] : [0, -78, -178]);
  const textOpacity = useTransform(cinematicProgress, [0, 0.18, 0.32], [1, 0.36, 0]);
  const textScale = useTransform(cinematicProgress, [0, 0.5], stabilizeVideoLayer ? [1, 1] : [1, 0.96]);
  const dashboardY = useTransform(cinematicProgress, [0, 0.28, 0.62, 1], stabilizeVideoLayer ? [0, 0, 0, 0] : [220, 100, -120, -88]);
  const dashboardScale = useTransform(cinematicProgress, [0, 0.42, 1], [0.92, 1, 0.98]);
  const dashboardOpacity = useTransform(cinematicProgress, [0, 0.24, 0.38, 0.82, 1], [0, 0, 1, 0.96, 0.74]);
  const dashboardRotateX = useTransform(cinematicProgress, [0, 0.62, 1], stabilizeVideoLayer ? [0, 0, 0] : [8, -5, -2]);

  return (
    <section ref={heroRef} data-nexxcloud-hero className="relative md:min-h-[230vh]">
      <div className="relative min-h-[100svh] overflow-hidden px-5 pb-14 pt-24 md:sticky md:top-0 md:min-h-screen md:px-6 md:pb-16 md:pt-32">
        {stabilizeVideoLayer ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(ellipse_90%_64%_at_50%_16%,rgba(100,210,255,0.24),transparent_58%),linear-gradient(130deg,rgba(37,99,235,0.16),transparent_34%,rgba(168,85,247,0.14)_72%,transparent)]"
          />
        ) : (
          <motion.div
            aria-hidden
            style={{ y: glowY, opacity: glowOpacity }}
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_64%_at_50%_16%,rgba(100,210,255,0.24),transparent_58%),linear-gradient(130deg,rgba(37,99,235,0.16),transparent_34%,rgba(168,85,247,0.14)_72%,transparent)]"
          />
        )}

        {stabilizeVideoLayer ? (
          <div
            aria-hidden
            data-nexxcloud-hero-video-layer
            className="apex-mobile-video-layer pointer-events-none absolute inset-[-8%] opacity-[0.92]"
          >
            {shouldReduceMotion ? (
              <img
                src="/media/nexxcloud-hero-poster.jpg"
                alt=""
                className="h-full w-full object-cover object-center"
                draggable={false}
              />
            ) : (
              <HeroVideo preferMobileSources={isMobileShell} stableCompositing={isMobileShell} />
            )}
          </div>
        ) : (
          <motion.div
            aria-hidden
            data-nexxcloud-hero-video-layer
            style={{ y: videoY, scale: videoScale, opacity: videoOpacity }}
            className="pointer-events-none absolute inset-[-8%] will-change-transform"
          >
            <HeroVideo preferMobileSources={false} />
          </motion.div>
        )}

        {stabilizeVideoLayer ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,4,12,0.62)_0%,rgba(5,7,17,0.58)_38%,rgba(8,10,22,0.88)_100%)]"
          />
        ) : (
          <motion.div
            aria-hidden
            style={{ opacity: overlayOpacity }}
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,4,12,0.56)_0%,rgba(5,7,17,0.5)_38%,rgba(8,10,22,0.86)_100%)]"
          />
        )}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_38%_at_50%_44%,transparent_0%,rgba(0,0,0,0.34)_72%,rgba(0,0,0,0.76)_100%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.55),transparent_18%,transparent_82%,rgba(0,0,0,0.55))]" />
        <div aria-hidden className={isMobileShell ? "pointer-events-none absolute inset-0 bg-black/16" : "pointer-events-none absolute inset-0 bg-black/10 backdrop-blur-[1px]"} />
        <div aria-hidden className="apex-hero-grain pointer-events-none absolute inset-0 opacity-[0.16]" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-6rem)] max-w-7xl flex-col items-center justify-start pt-[3vh] text-center md:min-h-[calc(100vh-7rem)] md:pt-[8vh]">
          <motion.div
            style={stabilizeVideoLayer ? undefined : { y: textY, opacity: textOpacity, scale: textScale }}
            className={`mx-auto max-w-5xl${stabilizeVideoLayer ? "" : " will-change-transform"}`}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="apex-mobile-frost mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-xs text-white/76 shadow-[0_0_30px_rgba(90,180,255,0.18)] backdrop-blur-2xl"
            >
              <span className="grid h-4 w-4 place-items-center rounded-full bg-white text-[10px] text-slate-950">v1</span>
              NexxCloud private cloud with apps
              <ArrowRight className="h-3 w-3" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.95, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="apex-text-shadow-cinematic font-display text-4xl font-bold leading-[0.98] text-white sm:text-5xl md:text-7xl lg:text-8xl"
            >
              Your private cloud, <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-white via-cyan-100 to-violet-100 bg-clip-text text-transparent">running files and apps.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto mt-5 max-w-xl text-balance text-sm leading-6 text-white/70 drop-shadow-[0_1px_22px_rgba(0,0,0,0.8)] md:text-base md:leading-7"
            >
              Self-hosted storage with resumable huge-file uploads, LAN access, bulk downloads, live server logs, and Docker Hub apps you can install from the browser.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3 md:mt-9"
            >
              <a href="/register" className="apex-hero-button apex-hero-button-primary inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white">
                Get Started <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#features" className="apex-hero-button inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white/88">
                <PlayCircle className="h-4 w-4" /> See Features
              </a>
              <a href="https://github.com/ShadowSafin/NewCloud" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm text-white/62 transition hover:text-white">
                <Github className="h-4 w-4" /> GitHub
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mx-auto mt-7 flex max-w-xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/58 md:mt-8 md:gap-x-6"
            >
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[var(--brand-cyan)]" /> Zero telemetry</span>
              <span className="inline-flex items-center gap-1.5"><Server className="h-3.5 w-3.5 text-[var(--brand-cyan)]" /> Docker app hosting</span>
              <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-[var(--brand-cyan)]" /> TB-scale uploads</span>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 mt-9 w-full max-w-[360px] pb-8 md:hidden"
          >
            <DashboardMock />
          </motion.div>

          <div className="pointer-events-none absolute bottom-[-30rem] left-0 right-0 z-10 hidden px-4 sm:bottom-[-20rem] md:block md:bottom-[-26rem] lg:bottom-[-24rem] xl:bottom-[-22rem]">
            <motion.div
              style={{ y: dashboardY, scale: dashboardScale, opacity: dashboardOpacity, rotateX: dashboardRotateX }}
              className="apex-perspective mx-auto w-full max-w-6xl origin-top will-change-transform"
            >
              <DashboardMock />
            </motion.div>
          </div>
        </div>
      </div>

      <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 hidden h-56 bg-gradient-to-b from-transparent via-[var(--canvas)]/72 to-[var(--canvas)] md:block" />
    </section>
  );
}

function useMobileShell() {
  const [isMobileShell, setIsMobileShell] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsMobileShell(
      window.parent !== window ||
      params.get("nexxcloudMobile") === "1" ||
      /NexxCloudMobile|Capacitor/i.test(window.navigator.userAgent)
    );
  }, []);

  return isMobileShell;
}

function HeroVideo({
  preferMobileSources,
  stableCompositing = false,
}: {
  preferMobileSources: boolean;
  stableCompositing?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const markReady = () => {
      setReady(true);
    };
    const startPlayback = () => {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      const playPromise = video.play();
      if (playPromise) {
        playPromise.then(markReady).catch(() => {
          retryTimer = setTimeout(startPlayback, 700);
        });
      }
    };

    video.addEventListener("loadeddata", markReady);
    video.addEventListener("canplay", markReady);
    video.addEventListener("playing", markReady);

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.load();
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      markReady();
    }
    startPlayback();

    const retryOnVisible = () => {
      if (!document.hidden) startPlayback();
    };

    document.addEventListener("visibilitychange", retryOnVisible);
    window.addEventListener("touchstart", startPlayback, { passive: true, once: true });

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      video.removeEventListener("loadeddata", markReady);
      video.removeEventListener("canplay", markReady);
      video.removeEventListener("playing", markReady);
      document.removeEventListener("visibilitychange", retryOnVisible);
      window.removeEventListener("touchstart", startPlayback);
    };
  }, [preferMobileSources]);

  if (failed) {
    return (
      <img
        src="/media/nexxcloud-hero-poster.jpg"
        alt=""
        className="h-full w-full scale-105 object-cover object-center"
        draggable={false}
      />
    );
  }

  return (
    <>
      {!stableCompositing && (
        <img
          src="/media/nexxcloud-hero-poster.jpg"
          alt=""
          className={`absolute inset-0 h-full w-full scale-105 object-cover object-center transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}
          draggable={false}
        />
      )}
      <video
        ref={videoRef}
        data-nexxcloud-hero-video
        className={stableCompositing
          ? "apex-mobile-hero-video block h-full w-full object-cover object-center"
          : `h-full w-full scale-105 object-cover object-center transition-opacity duration-700 ${ready || preferMobileSources ? "opacity-100" : "opacity-0"}`}
        autoPlay
        muted
        loop
        playsInline
        preload={preferMobileSources ? "auto" : "metadata"}
        poster="/media/nexxcloud-hero-poster.jpg"
        disablePictureInPicture
        aria-hidden
        onError={() => setFailed(true)}
      >
        {preferMobileSources ? (
          <>
            <source src="/media/nexxcloud-hero-android.mp4" type="video/mp4" />
            <source src="/media/nexxcloud-hero.webm" type="video/webm" />
            <source src="/media/nexxcloud-hero.mp4" type="video/mp4" />
          </>
        ) : (
          <>
            <source src="/media/nexxcloud-hero.mp4" type="video/mp4" />
            <source src="/media/nexxcloud-hero-android.mp4" type="video/mp4" />
            <source src="/media/nexxcloud-hero.webm" type="video/webm" />
          </>
        )}
      </video>
    </>
  );
}

function Marquee() {
  const items = ["Self-hosters", "Docker Apps", "LAN Sharing", "Desktop Server", "Homelabs", "NAS owners", "Bulk Downloads", "Privacy-first"];
  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-black/20 py-6">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-4 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">Built for people who own their files</div>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-muted-foreground/80">
          {items.map((i) => (<span key={i} className="font-display tracking-wide">{i}</span>))}
        </div>
      </div>
    </section>
  );
}
