import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import SolutionSection from "@/components/SolutionSection";
import DemoSection from "@/components/DemoSection";
import AICopilotSection from "@/components/AICopilotSection";
import ImpactSection from "@/components/ImpactSection";
import UseCasesSection from "@/components/UseCasesSection";
import Footer from "@/components/Footer";
import LiveStatsWidget from "@/components/LiveStatsWidget";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <HeroSection />
      {/* Floating Live Stats Widget */}
      <div className="fixed top-24 right-6 z-40 hidden xl:block">
        <LiveStatsWidget />
      </div>
      <ProblemSection />
      <SolutionSection />
      <DemoSection />
      <AICopilotSection />
      <ImpactSection />
      <UseCasesSection />
      <Footer />
    </main>
  );
}
