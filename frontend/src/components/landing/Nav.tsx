import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Github } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export function Nav({ stableCompositing = false }: { stableCompositing?: boolean }) {
  const { scrollYProgress } = useScroll();
  const smoothScroll = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    mass: 0.35,
  });
  const maxWidth = useTransform(smoothScroll, [0, 0.16], ["72rem", "54rem"]);
  const y = useTransform(smoothScroll, [0, 0.16], [0, -2]);
  const backgroundColor = useTransform(
    smoothScroll,
    [0, 0.16],
    ["rgba(7, 10, 24, 0.28)", "rgba(7, 10, 24, 0.62)"]
  );
  const borderColor = useTransform(
    smoothScroll,
    [0, 0.16],
    ["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.16)"]
  );
  const backdropFilter = useTransform(
    smoothScroll,
    [0, 0.16],
    ["blur(18px) saturate(145%)", "blur(30px) saturate(180%)"]
  );
  const boxShadow = useTransform(
    smoothScroll,
    [0, 0.16],
    [
      "0 18px 60px -28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
      "0 24px 80px -30px rgba(0,0,0,0.72), 0 0 48px rgba(83,175,255,0.08), inset 0 1px 0 rgba(255,255,255,0.08)",
    ]
  );

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      style={stableCompositing ? { maxWidth: "54rem" } : { maxWidth, y }}
      className={`fixed z-50 mx-auto ${stableCompositing ? "apex-mobile-nav-frame" : "left-2 right-2 top-3 sm:left-4 sm:right-4 sm:top-4"}`}
    >
      <motion.div
        style={stableCompositing ? {
          backgroundColor: "rgba(7, 10, 24, 0.88)",
          borderColor: "rgba(255, 255, 255, 0.14)",
          boxShadow: "0 18px 60px -28px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.07)",
        } : {
          backgroundColor,
          borderColor,
          backdropFilter,
          WebkitBackdropFilter: backdropFilter,
          boxShadow,
        }}
        className={`flex items-center justify-between rounded-full border ${stableCompositing ? "apex-mobile-nav px-2 py-1.5" : "px-2.5 py-2 sm:px-3"}`}
      >
        <a href="/" className={`flex items-center ${stableCompositing ? "gap-2 pl-1" : "gap-2 pl-2"}`}>
          <BrandMark className={`${stableCompositing ? "h-7 w-7 rounded-md" : "h-8 w-8"} apex-shadow-glow`} priority />
          <span className={`font-display font-semibold ${stableCompositing ? "text-base" : "text-base sm:text-lg"}`}>NexxCloud</span>
        </a>
        <nav className="hidden items-center gap-7 text-sm text-white/62 md:flex">
          <a className="transition hover:text-white" href="#features">Features</a>
          <a className="transition hover:text-white" href="#self-host">Self-host</a>
          <a className="transition hover:text-white" href="#pricing">Pricing</a>
          <a className="transition hover:text-white" href="#faq">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <a href="https://github.com/ShadowSafin/NewCloud" target="_blank" rel="noopener noreferrer" className="hidden items-center gap-2 rounded-full px-3 py-1.5 text-sm text-white/62 transition hover:text-white sm:inline-flex">
            <Github className="h-4 w-4" /> GitHub
          </a>
          <a href="/register" className={`inline-flex items-center rounded-full bg-white font-medium text-slate-950 shadow-[0_0_28px_rgba(130,220,255,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(130,220,255,0.35)] ${stableCompositing ? "px-3.5 py-1.5 text-[13px]" : "px-3.5 py-2 text-sm sm:px-4"}`}>
            Get Started
          </a>
        </div>
      </motion.div>
    </motion.header>
  );
}
