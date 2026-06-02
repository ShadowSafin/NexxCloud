import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Boxes,
  Check,
  Code2,
  Container,
  Database,
  Download,
  Eye,
  Film,
  FolderTree,
  Github,
  Globe,
  HardDrive,
  Lock,
  Network,
  RefreshCw,
  Search,
  Server,
  Share2,
  ShieldCheck,
  Star,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BrandMark } from "@/components/brand-mark";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

export function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={fadeUp}
      className="mx-auto mb-14 max-w-2xl text-center"
    >
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-cyan)]" /> {eyebrow}
      </div>
      <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">{title}</h2>
      {sub && <p className="mt-4 text-balance text-muted-foreground">{sub}</p>}
    </motion.div>
  );
}

const features = [
  { icon: Zap, title: "Resumable Huge Uploads", desc: "Chunked, parallel uploads built for large files and unstable LAN sessions." },
  { icon: Server, title: "Self-Hosted Freedom", desc: "Own the stack. Your data stays on your hardware. No vendor lock-in." },
  { icon: Container, title: "Docker App Marketplace", desc: "Search Docker Hub, inspect images, install apps, and manage them inside NexxCloud." },
  { icon: Activity, title: "Live App Monitoring", desc: "Watch CPU, memory, network, disk I/O, containers, ports, and logs in real time." },
  { icon: Network, title: "LAN Connection URLs", desc: "See the right local IP and app ports so phones, TVs, and other devices can connect." },
  { icon: Eye, title: "Instant Previews", desc: "Images, videos, audio, code and documents preview right in the browser." },
  { icon: Film, title: "File Streaming", desc: "Stream video and audio files directly from your server. No download needed." },
  { icon: Download, title: "Bulk Downloads", desc: "Select files and folders together, then download a clean ZIP with visible total size." },
  { icon: Search, title: "File Search", desc: "Search across all files by name, type, category, or folder." },
  { icon: Boxes, title: "Universal File Types", desc: "15+ file categories recognized: images, code, 3D models, datasets, and more." },
  { icon: Share2, title: "Secure Sharing", desc: "Generate public share links for any file with a single click." },
  { icon: Trash2, title: "Folder Trash & Restore", desc: "Deleted files and folders go to trash first. Restore them or empty trash permanently." },
];

export function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
      <SectionHeading
        eyebrow="Features"
        title="Files, folders, and apps in one private cloud."
        sub="A modern self-hosted platform for storage, sharing, LAN access, and Docker-powered apps."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            transition={{ delay: (index % 3) * 0.06 }}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-white/[0.02] p-6 apex-shadow-card transition hover:border-white/15 hover:bg-white/[0.04]"
          >
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[var(--gradient-brand)] opacity-0 blur-2xl transition group-hover:opacity-30" />
            <div className="mb-4 inline-grid h-11 w-11 place-items-center rounded-xl bg-white/[0.04] text-[var(--brand-cyan)] ring-1 ring-inset ring-white/10">
              <feature.icon className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function SelfHost() {
  const items = [
    { icon: ShieldCheck, title: "Full Data Ownership", desc: "Your files stay on your hardware with no third-party storage dependency." },
    { icon: Container, title: "Docker Apps Built In", desc: "Install trusted Docker Hub images from a guided marketplace flow." },
    { icon: HardDrive, title: "Local Storage Engine", desc: "Content-addressed blobs, folder metadata, previews, and backups live under your data directory." },
    { icon: Network, title: "LAN Ready", desc: "NexxCloud surfaces usable local IP addresses for the dashboard and installed apps." },
    { icon: Activity, title: "Native Server Logs", desc: "The desktop server app shows current live logs without pushing the window layout downward." },
    { icon: Lock, title: "Privacy by Default", desc: "No telemetry, no tracking, and no SaaS account required for your private cloud." },
  ];

  return (
    <section id="self-host" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
      <div className="grid items-start gap-12 lg:grid-cols-2">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-violet)]" /> Self-Hosting
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            The cloud, <span className="text-gradient">on your terms.</span>
          </h2>
          <p className="mt-5 max-w-md text-muted-foreground">
            Run NexxCloud on a homelab, NAS, Windows desktop server, or VPS. Store files, install apps, and connect from devices on your own network.
          </p>
          <div className="mt-8 rounded-2xl border border-border/60 bg-black/40 p-1 apex-shadow-elegant">
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2 text-xs text-muted-foreground">
              <Terminal className="h-3.5 w-3.5" /> bash
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words p-5 text-xs leading-relaxed sm:text-sm">
<span className="text-muted-foreground">$</span> git clone https://github.com/ShadowSafin/NewCloud NexxCloud
<span className="text-muted-foreground">$</span> cd NexxCloud
<span className="text-muted-foreground">$</span> docker compose up -d

<span className="text-muted-foreground"># open http://localhost:3000 or your LAN URL</span>
            </pre>
          </div>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item, index) => (
            <motion.div
              key={item.title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-border/60 bg-white/[0.02] p-5"
            >
              <item.icon className="h-5 w-5 text-[var(--brand-cyan)]" />
              <div className="mt-3 font-display font-semibold">{item.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    { n: "01", icon: Container, t: "Deploy", d: "Use Docker Compose or the desktop server app to start the private cloud runtime." },
    { n: "02", icon: HardDrive, t: "Store", d: "Upload, organize folders, preview media, share links, and download selections as ZIPs." },
    { n: "03", icon: Globe, t: "Connect", d: "Use LAN URLs and QR-friendly network settings to reach the server from other devices." },
    { n: "04", icon: Activity, t: "Run Apps", d: "Install Docker Hub apps, watch their stats, and open their exposed ports from the UI." },
  ];

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
      <SectionHeading eyebrow="How it works" title="One server. Four useful surfaces." />
      <div className="relative grid gap-6 md:grid-cols-4">
        <div className="absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:block" />
        {steps.map((step, index) => (
          <motion.div
            key={step.n}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ delay: index * 0.1 }}
            className="relative rounded-2xl border border-border/60 bg-white/[0.02] p-7 text-center"
          >
            <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--gradient-brand)] text-background apex-shadow-glow">
              <step.icon className="h-5 w-5" />
            </div>
            <div className="font-display text-xs text-muted-foreground">{step.n}</div>
            <h3 className="mt-1 font-display text-xl font-semibold">{step.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{step.d}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function Performance() {
  const stats = [
    { k: "TB-scale", l: "Configurable uploads" },
    { k: "ZIP", l: "Bulk downloads" },
    { k: "15+", l: "File categories" },
    { k: "Live", l: "Files and app stats" },
  ];

  const cards = [
    { i: Database, t: "Deduplication engine", d: "Content-hash based storage reduces duplicate bytes automatically." },
    { i: FolderTree, t: "Folder-aware bulk actions", d: "Move, copy, trash, restore, and download files and folders together." },
    { i: RefreshCw, t: "Background workers", d: "Uploads, thumbnails, integrity checks, and trash cleanup run outside the UI thread." },
  ];

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
      <SectionHeading
        eyebrow="Performance"
        title="Built for real files, not toy demos."
        sub="Large uploads, bulk downloads, background workers, and live feedback for both storage and Docker apps."
      />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-border/60 bg-white/[0.02] p-6 apex-shadow-card">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Runtime Throughput</div>
              <div className="font-display text-2xl font-semibold">Uploads, downloads, apps</div>
            </div>
            <Activity className="h-5 w-5 text-[var(--brand-cyan)]" />
          </div>
          <Sparkline />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.l} className="rounded-xl border border-border/60 bg-black/20 p-4">
                <div className="font-display text-lg font-semibold text-gradient">{stat.k}</div>
                <div className="text-[11px] text-muted-foreground">{stat.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {cards.map((card) => (
            <div key={card.t} className="flex items-start gap-4 rounded-2xl border border-border/60 bg-white/[0.02] p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] text-[var(--brand-violet)] ring-1 ring-inset ring-white/10">
                <card.i className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display font-semibold">{card.t}</div>
                <p className="text-sm text-muted-foreground">{card.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Sparkline() {
  const points = [12, 28, 22, 40, 35, 56, 48, 70, 60, 84, 76, 92, 80, 96];
  const max = Math.max(...points);
  const path = points.map((point, index) => `${(index / (points.length - 1)) * 100},${100 - (point / max) * 90}`).join(" ");

  return (
    <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border/60 bg-black/20 p-3">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.82 0.16 200)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="oklch(0.68 0.22 295)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline fill="none" stroke="url(#spark)" strokeWidth="1.4" points={path} />
        <polygon fill="url(#spark)" points={`0,100 ${path} 100,100`} opacity="0.4" />
      </svg>
    </div>
  );
}

export function Collaboration() {
  const activity = [
    { who: "You", what: "uploaded archive-4k-footage.mov", ago: "just now", i: Zap },
    { who: "You", what: "bulk downloaded Projects as a ZIP", ago: "2m", i: Download },
    { who: "Server", what: "installed jellyfin/jellyfin", ago: "8m", i: Container },
    { who: "You", what: "restored Design folder from trash", ago: "15m", i: RefreshCw },
  ];

  const bullets = [
    "Nested folders with breadcrumb navigation",
    "Favorites and starred files",
    "Folder-aware trash and restore",
    "Version history for every file",
    "Public share links",
    "Bulk ZIP downloads with total size",
    "Real-time WebSocket updates",
  ];

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <div className="rounded-2xl apex-glass p-6 apex-shadow-elegant">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-display font-semibold">Activity Feed</div>
              <div className="text-xs text-muted-foreground">Live via WebSocket</div>
            </div>
            <div className="space-y-3">
              {activity.map((entry, index) => (
                <motion.div
                  key={entry.what}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-white/[0.02] p-3"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.05] text-[var(--brand-cyan)]">
                    <entry.i className="h-4 w-4" />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{entry.who}</span> <span className="text-muted-foreground">{entry.what}</span>
                  </div>
                  <div className="ml-auto text-[11px] text-muted-foreground">{entry.ago}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="order-1 lg:order-2">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-cyan)]" /> File Management
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            Organize your files <span className="text-gradient">without friction.</span>
          </h2>
          <p className="mt-5 max-w-md text-muted-foreground">
            Folders, favorites, trash, search, version history, sharing, and bulk downloads are built into the main drive.
          </p>
          <ul className="mt-6 space-y-2 text-sm">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-4 w-4 text-[var(--brand-cyan)]" /> {bullet}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}

export function AISection() {
  const items = [
    { i: Container, t: "Docker Hub Marketplace", d: "Search official and community images, review trust signals, and install from the UI." },
    { i: Activity, t: "Realtime Install Page", d: "Pulling, analyzing, compose creation, boot status, logs, and stats stay visible." },
    { i: Network, t: "Connection URLs", d: "Installed apps expose LAN URLs and ports so other devices can connect directly." },
    { i: Terminal, t: "Live Server Logs", d: "The native server app tails current logs in a fixed panel for easier debugging." },
  ];

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
      <SectionHeading
        eyebrow="Apps Runtime"
        title="Install server apps like they belong there."
        sub="NexxCloud is not only a drive. It can become a small private app platform for your LAN."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <motion.div
            key={item.t}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ delay: index * 0.06 }}
            className="relative overflow-hidden rounded-2xl border border-border/60 bg-white/[0.02] p-6"
          >
            <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-[var(--brand-violet)] opacity-20 blur-2xl" />
            <item.i className="h-5 w-5 text-[var(--brand-violet)]" />
            <div className="mt-3 font-display font-semibold">{item.t}</div>
            <p className="mt-1 text-sm text-muted-foreground">{item.d}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function DevSection() {
  const bullets = [
    "Docker and Compose ready",
    "REST API for files and apps",
    "TypeScript throughout",
    "Prisma database layer",
    "Native desktop server runtime",
    "Open source on GitHub",
  ];

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
            <Code2 className="h-3.5 w-3.5" /> Built for developers
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">Open source and extensible.</h2>
          <p className="mt-5 max-w-md text-muted-foreground">
            A clean TypeScript codebase, REST endpoints for core operations, and a modular service layer that can grow with the project.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            {bullets.map((bullet) => (
              <div key={bullet} className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-4 w-4 text-[var(--brand-cyan)]" /> {bullet}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          className="rounded-2xl border border-border/60 bg-black/40 p-1 apex-shadow-elegant"
        >
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2 text-xs text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" /> REST API
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words p-5 text-xs leading-relaxed sm:text-sm">
<span className="text-muted-foreground"># Upload a file with chunks</span>
<span className="text-[var(--brand-violet)]">POST</span> <span className="text-[var(--brand-cyan)]">/api/uploads/initiate</span>
<span className="text-[var(--brand-violet)]">POST</span> <span className="text-[var(--brand-cyan)]">/api/uploads/:id/chunk/:index</span>
<span className="text-[var(--brand-violet)]">POST</span> <span className="text-[var(--brand-cyan)]">/api/uploads/:id/complete</span>

<span className="text-muted-foreground"># Files, folders, and bulk download</span>
<span className="text-[var(--brand-violet)]">GET</span>  <span className="text-[var(--brand-cyan)]">/api/files</span>
<span className="text-[var(--brand-violet)]">POST</span> <span className="text-[var(--brand-cyan)]">/api/files/download-bulk/sign</span>
<span className="text-[var(--brand-violet)]">GET</span>  <span className="text-[var(--brand-cyan)]">/api/files/download-bulk/:ticket</span>

<span className="text-muted-foreground"># Docker apps</span>
<span className="text-[var(--brand-violet)]">GET</span>  <span className="text-[var(--brand-cyan)]">/api/apps/marketplace</span>
<span className="text-[var(--brand-violet)]">POST</span> <span className="text-[var(--brand-cyan)]">/api/apps/install</span>
<span className="text-[var(--brand-violet)]">GET</span>  <span className="text-[var(--brand-cyan)]">/api/apps/installed/:id/logs</span>
          </pre>
        </motion.div>
      </div>
    </section>
  );
}

export function Testimonials() {
  const testimonials = [
    { q: "The Docker app flow turns my storage box into a real home server dashboard.", n: "Jonas R.", r: "Indie developer" },
    { q: "Finally a self-hosted drive that does not look or feel like old enterprise software.", n: "Sara L.", r: "Design lead" },
    { q: "Chunked uploads mean I can push huge video files over LAN without babysitting the tab.", n: "Marcus T.", r: "Filmmaker" },
    { q: "Seeing the LAN URLs and live app stats makes the whole thing easier to trust.", n: "Priya K.", r: "Homelab enthusiast" },
  ];

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
      <SectionHeading eyebrow="Loved by self-hosters" title="A community that ships." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {testimonials.map((item, index) => (
          <motion.div
            key={item.q}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ delay: index * 0.06 }}
            className="rounded-2xl border border-border/60 bg-white/[0.02] p-6"
          >
            <p className="text-sm leading-relaxed">"{item.q}"</p>
            <div className="mt-5 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--gradient-brand)]">
                <Star className="h-4 w-4 text-background" />
              </div>
              <div>
                <div className="text-sm font-medium">{item.n}</div>
                <div className="text-[11px] text-muted-foreground">{item.r}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function Pricing() {
  const included = [
    "Unlimited storage based on your disk",
    "Chunked resumable huge-file uploads",
    "Bulk ZIP downloads for files and folders",
    "15+ auto-detected file categories",
    "Version history, trash, and restore",
    "Public share links",
    "Docker Hub app marketplace",
    "Live app logs, stats, ports, and LAN URLs",
  ];

  return (
    <section id="pricing" className="relative mx-auto max-w-3xl px-4 py-24 sm:px-6 sm:py-28">
      <SectionHeading eyebrow="Pricing" title="Free. Self-hosted. Yours." />
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        variants={fadeUp}
        className="relative rounded-2xl border border-transparent bg-[linear-gradient(180deg,oklch(0.82_0.16_200_/_0.12),oklch(0.68_0.22_295_/_0.06))] p-8 text-center ring-1 ring-[var(--brand-cyan)]/40 apex-shadow-card"
      >
        <div className="font-display text-sm uppercase tracking-wider text-muted-foreground">Self-Hosted</div>
        <div className="mt-3 font-display text-5xl font-semibold">Free</div>
        <p className="mt-3 text-muted-foreground">Everything included. The limit is your hardware, network, and storage.</p>
        <ul className="mx-auto my-8 max-w-sm space-y-2 text-left text-sm">
          {included.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-[var(--brand-cyan)]" /> {feature}
            </li>
          ))}
        </ul>
        <a href="/register" className="inline-flex items-center gap-2 rounded-full bg-[var(--gradient-brand)] px-8 py-3 text-sm font-medium text-background transition apex-shadow-glow hover:opacity-90">
          Get Started <ArrowRight className="h-4 w-4" />
        </a>
      </motion.div>
    </section>
  );
}

export function FAQ() {
  const questions: [string, string][] = [
    ["Is NexxCloud open source?", "Yes. NexxCloud is open source and developed in the open on GitHub."],
    ["Can I self-host it?", "Yes. Run it with Docker Compose, or use the native desktop server app on Windows."],
    ["Can NexxCloud install Docker apps?", "Yes. The app marketplace searches Docker Hub, shows image metadata, installs Compose-managed apps, and exposes live logs and runtime stats."],
    ["Can other devices on my LAN connect?", "Yes. NexxCloud shows local network URLs for the dashboard and installed Docker apps so phones, tablets, TVs, and PCs can connect on the same network."],
    ["Does it support large files?", "Yes. Uploads are chunked and resumable, and file size limits are configurable for large local storage setups."],
    ["Can I download many files and folders at once?", "Yes. Select mixed files and folders, see the total size, and download them as one ZIP."],
    ["What file types are supported?", "All file types can be stored. NexxCloud also auto-categorizes common media, documents, code, archives, 3D models, datasets, and more."],
    ["Is it privacy focused?", "Yes. Your files stay on your hardware. NexxCloud does not require a SaaS storage provider for your private cloud."],
  ];

  return (
    <section id="faq" className="relative mx-auto max-w-3xl px-4 py-24 sm:px-6 sm:py-28">
      <SectionHeading eyebrow="FAQ" title="Questions, answered." />
      <Accordion type="single" collapsible className="w-full">
        {questions.map(([question, answer], index) => (
          <AccordionItem key={question} value={`q-${index}`} className="border-b border-border/60">
            <AccordionTrigger className="text-left font-display text-base font-medium">{question}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section id="cta" className="relative mx-auto max-w-6xl px-4 py-28 sm:px-6 sm:py-32">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-white/[0.02] p-12 text-center apex-shadow-elegant md:p-20">
        <div className="absolute inset-0 -z-10 bg-grid opacity-50" />
        <div className="absolute -top-32 left-1/2 -z-10 h-80 w-[700px] -translate-x-1/2 rounded-full bg-[var(--gradient-brand)] opacity-30 blur-3xl" />
        <h2 className="font-display text-4xl font-semibold tracking-tight md:text-6xl">
          Build the private cloud <br />your network deserves.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
          Store files, share securely, install apps, and keep the server under your control.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="/register" className="inline-flex items-center gap-2 rounded-full bg-[var(--gradient-brand)] px-6 py-3 text-sm font-medium text-background transition apex-shadow-glow hover:opacity-90">
            Start Self-Hosting <ArrowRight className="h-4 w-4" />
          </a>
          <a href="https://github.com/ShadowSafin/NewCloud" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/[0.03] px-6 py-3 text-sm font-medium transition hover:bg-white/[0.06]">
            <Github className="h-4 w-4" /> View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border/60 px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <BrandMark className="h-8 w-8" />
            <span className="font-display text-lg font-semibold">NexxCloud</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Self-hosted cloud storage, LAN sharing, and Docker app hosting. Own your data and your runtime.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          {[
            { h: "Product", l: [{ t: "Features", href: "#features" }, { t: "Pricing", href: "#pricing" }, { t: "FAQ", href: "#faq" }] },
            { h: "Developers", l: [{ t: "GitHub", href: "https://github.com/ShadowSafin/NewCloud" }, { t: "Docker Apps", href: "/apps" }, { t: "REST API", href: "#features" }] },
            { h: "Account", l: [{ t: "Sign In", href: "/login" }, { t: "Register", href: "/register" }] },
          ].map((column) => (
            <div key={column.h}>
              <div className="mb-3 font-display text-xs uppercase tracking-wider text-muted-foreground">{column.h}</div>
              <ul className="space-y-2">
                {column.l.map((link) => (
                  <li key={link.t}>
                    <a href={link.href} className="text-muted-foreground transition hover:text-foreground">{link.t}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-border/60 pt-6 text-xs text-muted-foreground">
        Copyright {new Date().getFullYear()} NexxCloud. Built for people who own their files.
      </div>
    </footer>
  );
}
