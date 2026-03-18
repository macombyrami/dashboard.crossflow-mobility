import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrossFlow Mobility — IA pour la mobilité urbaine intelligente",
  description:
    "Analysez, simulez et optimisez le trafic urbain en temps réel grâce à l'IA. La plateforme dédiée aux villes intelligentes de demain.",
  keywords: ["IA urbaine", "trafic", "smart city", "mobilité", "optimisation", "temps réel"],
  authors: [{ name: "CrossFlow Mobility" }],
  openGraph: {
    title: "CrossFlow Mobility",
    description: "Analysez et optimisez le trafic urbain en temps réel grâce à l'IA.",
    type: "website",
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
