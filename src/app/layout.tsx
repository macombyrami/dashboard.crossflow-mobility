import type { Metadata } from "next";
import "./globals.css";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#08090B",
};

export const metadata: Metadata = {
  title: "CrossFlow Mobility | IA pour la Gestion Intelligente du Trafic Urbain",
  description:
    "Plateforme d'IA révolutionnaire pour les villes intelligentes. Optimisez la mobilité urbaine, réduisez les embouteillages et simulez l'avenir du transport en temps réel avec CrossFlow.",
  metadataBase: new URL("https://crossflow-mobility.com"),
  alternates: {
    canonical: "/",
    languages: {
      "fr-FR": "/fr",
      "en-US": "/en",
      "pt-PT": "/pt",
    },
  },
  keywords: [
    "IA urbaine",
    "Smart City",
    "Mobilité Urbaine",
    "Gestion du Trafic",
    "Simulation Urbaine",
    "Ville Intelligente",
    "Optimisation Transport",
    "IA temps réel",
  ],
  authors: [{ name: "CrossFlow Mobility Team" }],
  manifest: "/manifest.json",
  openGraph: {
    title: "CrossFlow Mobility | Smart City AI",
    description: "Analysez et optimisez le trafic urbain en temps réel grâce à l'IA.",
    url: "https://crossflow-mobility.com",
    siteName: "CrossFlow Mobility",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CrossFlow Mobility Platform",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CrossFlow Mobility | IA Urbaine",
    description: "Optimisez la mobilité urbaine en temps réel.",
    images: ["/og-image.png"],
    creator: "@crossflow_mobility",
  },
  robots: {
    index: true,
    follow: true,
  },
};

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
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
          Passer au contenu principal
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <div id="main-content">
          {children}
        </div>
      </body>
    </html>
  );
}
