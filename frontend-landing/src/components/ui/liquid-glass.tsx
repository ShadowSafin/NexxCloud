"use client";

import type { CSSProperties, ReactNode } from "react";

interface GlassEffectProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  enabled?: boolean;
  style?: CSSProperties;
}

export function GlassEffect({
  children,
  className = "",
  contentClassName = "",
  enabled = true,
  style,
}: GlassEffectProps) {
  return (
    <div
      className={`relative overflow-hidden transition-all duration-500 ${className}`}
      style={{
        boxShadow: enabled
          ? "0 10px 34px rgba(0, 0, 0, 0.3), 0 0 24px rgba(6, 182, 212, 0.05)"
          : undefined,
        ...style,
      }}
    >
      {enabled && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
            style={{
              backdropFilter: "blur(16px) saturate(125%)",
              WebkitBackdropFilter: "blur(16px) saturate(125%)",
              filter: "url(#liquid-glass-distortion)",
              isolation: "isolate",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
            style={{
              background:
                "linear-gradient(115deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04) 36%, rgba(6,182,212,0.08)), rgba(5, 7, 12, 0.72)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
            style={{
              boxShadow:
                "inset 1px 1px 0 rgba(255,255,255,0.22), inset -1px -1px 0 rgba(255,255,255,0.07)",
            }}
          />
        </>
      )}
      <div className={`relative z-30 ${contentClassName}`}>{children}</div>
    </div>
  );
}

export function GlassFilter() {
  return (
    <svg
      aria-hidden="true"
      className="absolute h-0 w-0"
      focusable="false"
    >
      <filter
        id="liquid-glass-distortion"
        x="-10%"
        y="-10%"
        width="120%"
        height="120%"
        filterUnits="objectBoundingBox"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.001 0.005"
          numOctaves="1"
          seed="17"
          result="turbulence"
        />
        <feComponentTransfer in="turbulence" result="mapped">
          <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
          <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
          <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
        </feComponentTransfer>
        <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
        <feSpecularLighting
          in="softMap"
          surfaceScale="5"
          specularConstant="1"
          specularExponent="100"
          lightingColor="white"
          result="specLight"
        >
          <fePointLight x="-200" y="-200" z="300" />
        </feSpecularLighting>
        <feComposite
          in="specLight"
          operator="arithmetic"
          k1="0"
          k2="1"
          k3="1"
          k4="0"
          result="litImage"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="softMap"
          scale="12"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}
