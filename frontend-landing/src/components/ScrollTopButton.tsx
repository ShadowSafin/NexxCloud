"use client";

import { ArrowUp } from "lucide-react";

export default function ScrollTopButton() {
  const handleScrollTop = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={handleScrollTop}
      className="p-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-foreground transition-all duration-300 shadow-md"
      title="Scroll to top"
      aria-label="Scroll to top"
      id="btn-footer-scroll-top"
    >
      <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
    </button>
  );
}
