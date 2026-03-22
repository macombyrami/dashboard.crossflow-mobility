import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col pt-32">
      <Navbar />
      <div className="flex-1 max-w-4xl mx-auto px-5 sm:px-8 pb-32">
        <div className="glass rounded-3xl p-8 sm:p-12 border border-white/[0.08] prose prose-invert max-w-none">
          {children}
        </div>
      </div>
      <Footer />
    </main>
  );
}
