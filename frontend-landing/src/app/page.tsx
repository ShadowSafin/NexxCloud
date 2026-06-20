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
        
        {/* Main content wrapper with Earth background anchored at the bottom */}
        <div className="relative w-full flex flex-col">
          {/* Earth Background */}
          <div className="absolute inset-x-0 bottom-0 z-0 pointer-events-none flex items-end justify-center">
            {/* w-full h-auto prevents any cropping. It anchors at the bottom and reaches up to SelfHosting. */}
            <img 
              src="https://violet-peaceful-nightingale-428.mypinata.cloud/ipfs/bafybeiang2i3kafhvekksmmg36wznhh23nvxfd2oemgyt5c5e6etmscrta" 
              alt="Earth from Space" 
              className="w-full h-auto opacity-60 mix-blend-screen"
            />
          </div>

          <div className="relative z-10 flex flex-col w-full">
            <Features />
            <SelfHosting />
            <AppsSection />
            <OpenSource />
            <Roadmap />
            <FAQ />
          </div>
        </div>
      </main>

      <Footer />
    </SpotlightShell>
  );
}
