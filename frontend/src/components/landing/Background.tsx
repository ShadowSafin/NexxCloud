export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-60" />
      <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--brand-violet)] opacity-25 blur-[140px] animate-pulse-glow" />
      <div className="absolute top-1/3 -left-40 h-[500px] w-[500px] rounded-full bg-[var(--brand-cyan)] opacity-20 blur-[140px]" />
      <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-[var(--brand-blue)] opacity-20 blur-[140px]" />
    </div>
  );
}