import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import SolutionSection from "@/components/SolutionSection";
import DemoSection from "@/components/DemoSection";
import AICopilotSection from "@/components/AICopilotSection";
import ImpactSection from "@/components/ImpactSection";
import UseCasesSection from "@/components/UseCasesSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <HeroSection />
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
