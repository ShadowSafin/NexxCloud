export default function Roadmap() {
  const milestones = [
    {
      quarter: "AVAILABLE",
      title: "Storage Integrity Core",
      status: "available",
      description: "Content-addressed blobs, chunked uploads, signed media access, and scheduled storage/reference repair workers.",
      badge: "In Source",
      color: "border-brand-cyan/20 text-brand-cyan bg-brand-cyan/5",
    },
    {
      quarter: "AVAILABLE",
      title: "Docker and Native Hosting",
      status: "available",
      description: "A one-command Docker deployment plus a native Windows server host with LAN URLs and fixed live logs.",
      badge: "In Source",
      color: "border-brand-cyan/20 text-brand-cyan bg-brand-cyan/5",
    },
    {
      quarter: "AVAILABLE",
      title: "Docker App Marketplace",
      status: "available",
      description: "Docker Hub search, image details, install flow, app controls, runtime stats, logs, and exposed connection URLs.",
      badge: "In Source",
      color: "border-brand-cyan/20 text-brand-cyan bg-brand-cyan/5",
    },
    {
      quarter: "AVAILABLE",
      title: "Folder Bulk Operations",
      status: "available",
      description: "Folder-aware filters, trash handling, mixed file/folder selection, visible selected size, and ZIP bulk downloads.",
      badge: "In Source",
      color: "border-brand-cyan/20 text-brand-cyan bg-brand-cyan/5",
    },
    {
      quarter: "AVAILABLE",
      title: "Connected Clients",
      status: "available",
      description: "A secured Windows desktop wrapper and an Android companion wrapper for LAN-hosted servers.",
      badge: "In Source",
      color: "border-brand-cyan/20 text-brand-cyan bg-brand-cyan/5",
    },
    {
      quarter: "FUTURE",
      title: "Replication and Collaboration",
      status: "planned",
      description: "Multi-node replication, collaboration, and expanded indexing remain future work rather than shipped guarantees.",
      badge: "Future",
      color: "border-white/5 text-zinc-400 bg-white/5",
    },
  ];

  return (
    <section id="roadmap" className="defer-render py-24 md:py-32 px-6 md:px-12 bg-[#030303] relative z-10">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Block */}
        <div className="text-center mb-20">
          <div className="text-xs font-semibold uppercase tracking-widest text-brand-cyan mb-3">
            Project status
          </div>
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-foreground">
            Shipped storage. Shipped app runtime.
          </h2>
          <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto mt-4 leading-relaxed tracking-tight">
            Available items are represented in source; future work is labeled separately.
          </p>
        </div>

        {/* Timeline Layout */}
        <div className="relative border-l border-white/5 ml-4 md:ml-12 pl-6 md:pl-12 flex flex-col gap-12">
          {milestones.map((milestone) => (
            <div key={milestone.title} className="relative group">
              
              {/* Timeline dot */}
              <div className="absolute -left-[31px] md:-left-[55px] top-1 z-20">
                {milestone.status === "available" ? (
                  <div className="w-4 h-4 rounded-full bg-brand-cyan border-4 border-[#030303] shadow-lg shadow-brand-cyan/20" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-zinc-800 border-4 border-[#030303]" />
                )}
              </div>

              {/* Milestones Container */}
              <div className="flex flex-col gap-3 p-6 rounded-2xl border border-white/5 bg-zinc-900/10 hover:bg-zinc-900/20 hover:border-white/10 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-radial-bg opacity-0 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none" />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono text-xs font-bold text-zinc-500">
                    {milestone.quarter}
                  </span>
                  
                  {/* Custom status chip */}
                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-medium ${milestone.color}`}>
                    {milestone.badge}
                  </span>
                </div>

                <h3 className="text-[15px] font-semibold text-zinc-200 group-hover:text-foreground transition-colors tracking-tight">
                  {milestone.title}
                </h3>
                
                <p className="text-[13px] leading-relaxed text-zinc-400 group-hover:text-zinc-300 transition-colors tracking-tight">
                  {milestone.description}
                </p>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
