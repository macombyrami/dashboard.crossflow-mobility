import { getDictionary } from "@/lib/get-dictionary";
import { Locale } from "@/lib/i18n-config";

export default async function LegalLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { children } = props;
  const params = await props.params;
  const locale = params.locale as Locale;
  const dictionary = await getDictionary(locale);

  return (
    <main className="min-h-screen flex flex-col pt-32">
      <div className="flex-1 max-w-4xl mx-auto px-5 sm:px-8 pb-32">
        <div className="glass rounded-3xl p-8 sm:p-12 border border-white/[0.08] prose prose-invert max-w-none">
          {children}
        </div>
      </div>
    </main>
  );
}
