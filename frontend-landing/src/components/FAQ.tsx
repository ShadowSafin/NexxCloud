import { ChevronDown, HelpCircle } from "lucide-react";

export default function FAQ() {
  const faqs = [
    {
      question: "Is NexxCloud completely self-hosted?",
      answer: "Yes. Docker Compose runs the frontend, API, PostgreSQL, Redis, and workers on your infrastructure. The Windows server app packages a local SQLite runtime and local workers.",
    },
    {
      question: "Can NexxCloud install Docker apps?",
      answer: "Yes. NexxCloud includes a Docker Hub app marketplace with image search, metadata, install flow, installed app controls, live logs, runtime stats, and exposed LAN connection URLs.",
    },
    {
      question: "Does it support local area network (LAN) access?",
      answer: "Yes. NexxCloud exposes dashboard URLs and installed app URLs using usable LAN IP addresses, so other devices on the same network can connect.",
    },
    {
      question: "Can I download multiple files and folders at once?",
      answer: "Yes. Select files and folders together, see the total selected size, and download them as a ZIP archive.",
    },
    {
      question: "Is Docker required to run NexxCloud?",
      answer: "No. Docker Compose is the full multi-service deployment path. The Windows native server host packages a local runtime for users who want a desktop-style server app.",
    },
    {
      question: "Is there a Windows server app available?",
      answer: "Yes. The server app includes start, stop, restart, backup, data-folder access, LAN URLs, and a fixed live-log panel that follows the current output.",
    },
    {
      question: "How does the Android mobile app work?",
      answer: "The Android wrapper loads your LAN-hosted NexxCloud interface and includes reconnect handling plus native camera and share integration.",
    },
    {
      question: "Where can I verify source and licensing?",
      answer: "Use the linked GitHub repository as the source of truth for source code, licensing, releases, contribution guidance, and security documentation.",
    },
  ];

  return (
    <section id="faq" className="defer-render relative z-10 bg-zinc-950/20 px-6 py-24 md:px-12 md:py-32">
      <div className="mx-auto max-w-3xl">
        <div className="mb-16 text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-cyan">
            Have questions?
          </div>
          <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400 md:text-base">
            Clear details about storage, LAN access, native apps, and Docker app hosting.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {faqs.map((faq, index) => (
            <details
              key={faq.question}
              className="group overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/10 transition-all duration-300 hover:bg-zinc-900/20"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between p-6 text-left text-[14px] font-semibold text-zinc-200 transition-colors hover:text-foreground md:text-[15px] [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-3 pr-4">
                  <HelpCircle className="h-4 w-4 shrink-0 text-zinc-500 transition-colors group-hover:text-brand-cyan" />
                  <span className="leading-tight tracking-tight">{faq.question}</span>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-500 group-open:rotate-180 group-open:text-brand-cyan" />
              </summary>

              <div id={`faq-panel-${index}`} className="border-t border-white/5">
                <p className="p-6 text-[13px] font-medium leading-relaxed tracking-tight text-zinc-400">
                  {faq.answer}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
