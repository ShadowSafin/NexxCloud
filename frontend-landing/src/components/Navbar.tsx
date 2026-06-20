"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import GithubIcon from "./GithubIcon";
import { GlassEffect, GlassFilter } from "./ui/liquid-glass";

const navLinks = [
  { name: "Features", href: "#features" },
  { name: "Deployment", href: "#self-hosting" },
  { name: "Clients", href: "#apps" },
  { name: "GitHub", href: "https://github.com/ShadowSafin/NexxCloud", isExternal: true },
  { name: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const menuButton = menuButtonRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      (previouslyFocused ?? menuButton)?.focus();
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <GlassFilter />
      <nav
        aria-label="Primary"
        id="navbar"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${
          scrolled
            ? "mt-2 max-w-7xl mx-auto scale-[0.98] w-[95%]"
            : "w-full"
        }`}
      >
        <GlassEffect
          enabled={scrolled}
          className={scrolled ? "rounded-full border border-white/10" : ""}
          contentClassName={scrolled ? "py-2 px-3 md:px-6" : "py-4 px-6 md:px-12"}
        >
          <div className="flex items-center justify-between">
            <a
              href="#"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-black/40 text-foreground font-display font-bold text-[11px] uppercase tracking-[0.2em] transition-all hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.15)]"
              id="nav-logo"
            >
              <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse shadow-[0_0_8px_#ffffff]" />
              <span>NexxCloud</span>
            </a>

            <div className="hidden md:flex items-center gap-1 bg-white/[0.02] px-1 py-0.5 rounded-full border border-white/5 backdrop-blur-md">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target={link.isExternal ? "_blank" : undefined}
                  rel={link.isExternal ? "noopener noreferrer" : undefined}
                  className="px-4 py-1.5 rounded-full text-[11px] font-display font-semibold uppercase tracking-wider text-zinc-400 hover:text-white transition-all duration-300 hover:bg-white/[0.04] flex items-center gap-1 group/item"
                >
                  {link.name}
                  {link.isExternal && (
                    <ArrowUpRight className="w-3 h-3 opacity-40 group-hover/item:opacity-100 group-hover/item:translate-x-0.5 group-hover/item:-translate-y-0.5 transition-all" />
                  )}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <a
                href="#self-hosting"
                className="inline-flex items-center p-0.5 pl-4 pr-1 rounded-full bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all hover:bg-white/[0.06] group text-[11px] font-display font-semibold uppercase tracking-wider text-zinc-300 hover:text-white"
                id="btn-nav-host"
              >
                <span>Deploy Server</span>
                <span className="ml-3 flex items-center justify-center w-6 h-6 rounded-full bg-white text-black transition-transform group-hover:translate-x-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </a>
            </div>

            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-zinc-400 hover:text-foreground hover:bg-white/5 rounded-lg transition-all"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              id="btn-mobile-menu-open"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </GlassEffect>
      </nav>

      {mobileMenuOpen && (
        <div
          ref={dialogRef}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-50 bg-[#030303]/90 backdrop-blur-md md:hidden"
        >
          <div className="flex flex-col h-full p-6 justify-between">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between pb-6 border-b border-white/5">
                <a href="#" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <div className="w-8 h-8 overflow-hidden rounded-lg border border-white/10">
                    <span aria-hidden="true" className="block h-full w-full bg-[url('/icon.png')] bg-cover" />
                  </div>
                  <span className="font-semibold text-lg">
                    Nexx<span className="text-zinc-400 font-normal">Cloud</span>
                  </span>
                </a>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-zinc-400 hover:text-foreground hover:bg-white/5 rounded-lg transition-all"
                  aria-label="Close menu"
                  id="btn-mobile-menu-close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-4 mt-4">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    target={link.isExternal ? "_blank" : undefined}
                    rel={link.isExternal ? "noopener noreferrer" : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-lg font-medium text-zinc-400 hover:text-foreground transition-all flex items-center justify-between py-2 border-b border-white/5"
                  >
                    <span>{link.name}</span>
                    {link.isExternal && <ArrowUpRight className="w-4 h-4 opacity-45" />}
                  </a>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-auto">
              <a
                href="https://github.com/ShadowSafin/NexxCloud"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-white/10 text-sm font-medium text-zinc-300 bg-white/5 hover:bg-white/10 transition-all"
              >
                <GithubIcon className="w-5 h-5" />
                <span>GitHub</span>
              </a>
              <a
                href="#self-hosting"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full py-3.5 rounded-xl bg-foreground hover:bg-zinc-200 text-background text-sm font-semibold transition-all shadow-lg"
              >
                Deploy
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
