import type { Metadata } from "next";
import { i18n } from "@/lib/i18n-config";
import "../globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#08090B",
};

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }));
}

import { getDictionary } from "@/lib/get-dictionary";
import { Locale } from "@/lib/i18n-config";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale as Locale;
  const dictionary = await getDictionary(locale);
  const { metadata: dict } = dictionary;

  return {
    title: dict.title,
    description: dict.description,
    metadataBase: new URL("https://crossflow-mobility.com"),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        "fr-FR": "/fr",
        "en-US": "/en",
        "pt-PT": "/pt",
      },
    },
    keywords: dict.keywords.split(", "),
    authors: [{ name: "CrossFlow Mobility Team" }],
    manifest: "/manifest.json",
    openGraph: {
      title: dict.title,
      description: dict.description,
      url: `https://crossflow-mobility.com/${locale}`,
      siteName: "CrossFlow Mobility",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: "CrossFlow Mobility Platform",
        },
      ],
      locale: locale === "en" ? "en_US" : locale === "pt" ? "pt_PT" : "fr_FR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: dict.title,
      description: dict.description,
      images: ["/og-image.png"],
      creator: "@crossflow_mobility",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "CrossFlow Mobility",
  "operatingSystem": "Web",
  "applicationCategory": "BusinessApplication, SmartCity",
  "description": "Plateforme d'IA pour la gestion intelligente du trafic urbain.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "EUR"
  },
  "publisher": {
    "@type": "Organization",
    "name": "CrossFlow Mobility",
    "url": "https://crossflow-mobility.com",
    "logo": "https://crossflow-mobility.com/logo.png"
  }
};

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { children } = props;
  const params = await props.params;
  const locale = params.locale as Locale;
  const dictionary = await getDictionary(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Inter variable font — full weight axis for crisp rendering */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
          rel="stylesheet"
        />
        {/* JetBrains Mono for KPI / code-style numbers */}
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-white antialiased">
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-6 focus:py-3 focus:bg-primary focus:text-black focus:font-bold focus:rounded-xl focus:shadow-[0_0_40px_rgba(34,197,94,0.4)] transition-all"
        >
          {dictionary.common?.skipToContent || "Passer au contenu principal"}
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Navbar locale={locale} dictionary={dictionary.common} />
        <div id="main-content">
          {children}
        </div>
        <Footer dictionary={dictionary.footer} locale={locale} />
      </body>
    </html>
  );
}
