import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrossFlow Mobility | IA pour la Gestion Intelligente du Trafic Urbain",
  description:
    "Plateforme d'IA révolutionnaire pour les villes intelligentes. Optimisez la mobilité urbaine, réduisez les embouteillages et simulez l'avenir du transport en temps réel avec CrossFlow.",
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
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  themeColor: "#08090B",
  manifest: "/manifest.json",
  openGraph: {
    title: "CrossFlow Mobility | Smart City AI",
    description: "Analysez et optimisez le trafic urbain en temps réel grâce à l'IA.",
    url: "https://crossflow.mobility",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
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
        {children}
      </body>
    </html>
  );
}
