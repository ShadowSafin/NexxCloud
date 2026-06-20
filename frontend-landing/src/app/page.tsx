import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import SelfHosting from "@/components/SelfHosting";
import AppsSection from "@/components/AppsSection";
import OpenSource from "@/components/OpenSource";
import Roadmap from "@/components/Roadmap";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import SpotlightShell from "@/components/SpotlightShell";
import StructuredData from "@/components/StructuredData";

export default function Home() {
  return (
    <SpotlightShell>
      <StructuredData />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      <Navbar />

      <main className="relative z-10 flex-1 flex flex-col">
        <Hero />
        <Features />
        <SelfHosting />
        <AppsSection />
        <OpenSource />
        <Roadmap />
        <FAQ />
      </main>

      <Footer />
    </SpotlightShell>
  );
}
