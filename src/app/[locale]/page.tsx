import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import SolutionSection from "@/components/SolutionSection";
import DemoSection from "@/components/DemoSection";
import AICopilotSection from "@/components/AICopilotSection";
import ImpactSection from "@/components/ImpactSection";
import UseCasesSection from "@/components/UseCasesSection";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import LiveStatsWidget from "@/components/LiveStatsWidget";

import { getDictionary } from "@/lib/get-dictionary";
import { i18n, Locale } from "@/lib/i18n-config";

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }));
}

export default async function Home(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const locale = params.locale as Locale;
  const dictionary = await getDictionary(locale);

  return (
    <main className="relative">
      <HeroSection dictionary={dictionary.hero} />
      {/* Floating Live Stats Widget */}
      <div className="fixed top-24 right-6 z-40 hidden xl:block">
        <LiveStatsWidget dictionary={dictionary.liveStats} />
      </div>
      <ProblemSection dictionary={dictionary.problem} />
      <SolutionSection dictionary={dictionary.solution} />
      <DemoSection dictionary={dictionary.demo} />
      <AICopilotSection dictionary={dictionary.copilot} />
      <ImpactSection dictionary={dictionary.impact} />
      <UseCasesSection dictionary={dictionary.useCases} />
      <AboutSection dictionary={dictionary.about} />
      <ContactSection dictionary={dictionary.contact} />
    </main>
  );
}
