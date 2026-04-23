const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        AlignmentType, WidthType, BorderStyle, ShadingType, HeadingLevel } = require('docx');
const fs = require('fs');

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 22 },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1F4E78" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "2E75B6" },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("CrossFlow Mobility - Audit & Plan d'Enrichissement")],
        }),
        new Paragraph({
          children: [new TextRun("Analyse de la carte et recommandations de scaling")],
          spacing: { after: 240 },
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("1. État actuel du projet")],
        }),

        new Paragraph({
          children: [new TextRun("✅ Points forts détectés :")],
          spacing: { before: 120 },
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("Architecture Next.js 16 avec Turbopack (compilateur ultra-rapide)")],
          spacing: { before: 0 },
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("Zustand pour state management (store/mapStore)")],
          spacing: { before: 0 },
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("Tailwind CSS + Radix UI pour UI premium")],
          spacing: { before: 0 },
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("Supabase pour persistance temps réel")],
          spacing: { before: 0 },
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("Leaflet + MapLibre GL + react-map-gl pour cartographie avancée")],
          spacing: { before: 0 },
          numbering: { reference: "bullets", level: 0 },
        }),

        new Paragraph({
          children: [new TextRun("⚠️ Points à améliorer :")],
          spacing: { before: 240, after: 0 },
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("Utilisations partielles des APIs disponibles")],
          spacing: { before: 0 },
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("Pas de caching côté client pour optimiser requêtes API")],
          spacing: { before: 0 },
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("Absence de clustering/aggrégation de données")],
          spacing: { before: 0 },
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("Couches heatmap non optimisées pour performance")],
          spacing: { before: 0, after: 240 },
          numbering: { reference: "bullets", level: 0 },
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("2. APIs disponibles et non exploitées")],
        }),

        createTable([
          ["API", "Statut", "Bénéfice"],
          ["TomTom", "Intégré", "Trafic temps réel + incidents"],
          ["HERE", "Intégré", "Flow data + incidents"],
          ["OpenWeather", "Non utilisé", "Météo + qualité air"],
          ["Navitia (IDFM)", "Backend seulement", "Transports publics détaillés"],
          ["Overpass (OSM)", "Non activé", "POI: magasins, parkings, stations"],
          ["PredictHQ", "Intégré", "Événements urbains"],
          ["TicketMaster", "Intégré", "Événements culturels"],
          ["Stadia Maps", "Intégré", "Fonds de carte alternatifs"],
        ]),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("3. Plan d'enrichissement prioritaire")],
        }),

        createPriorityTable(),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("4. Implémentations recommandées")],
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("Phase 1 (Semaine 1): POI & Couches de base")],
          spacing: { before: 120, after: 120 },
        }),

        new Paragraph({
          children: [new TextRun("Ajouter 3 nouvelles couches à la carte :")],
          spacing: { after: 120 },
        }),

        new Paragraph({
          children: [new TextRun("1. Weather Layer (météo temps réel)"),],
          numbering: { reference: "numbers", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("2. POI Layer (points d'intérêt Overpass)")],
          numbering: { reference: "numbers", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("3. Transit Layer (transports IDFM avancé)")],
          numbering: { reference: "numbers", level: 0 },
          spacing: { after: 240 },
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("Phase 2 (Semaine 2-3): Performance & UX")],
          spacing: { before: 120, after: 120 },
        }),

        new Paragraph({
          children: [new TextRun("- Implémenter clustering Mapbox pour incidents/POI")],
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("- Ajouter caching IndexedDB pour API responses")],
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("- Optimiser heatmap avec WebGL (mapbox-gl)"),],
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 240 },
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("Phase 3 (Semaine 4): Intelligence IA")],
          spacing: { before: 120, after: 120 },
        }),

        new Paragraph({
          children: [new TextRun("- Analyse anomalies trafic avec OpenRouter LLM")],
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("- Recommandations itinéraires intelligentes")],
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("- Alertes prédictives (congestions 30min d'avance)"),],
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 240 },
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("5. Ordre de priorité pour démarrer")],
        }),

        new Paragraph({
          children: [new TextRun("🔴 URGENT (Jour 1)")],
          spacing: { before: 120, after: 60 },
        }),
        new Paragraph({
          children: [new TextRun("- Activer couche météo avec OpenWeatherMap API")],
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("- Ajouter layer toggle pour affichage/masquage")],
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 120 },
        }),

        new Paragraph({
          children: [new TextRun("🟠 HAUTE PRIORITÉ (Jours 2-3)")],
          spacing: { before: 120, after: 60 },
        }),
        new Paragraph({
          children: [new TextRun("- POI layer avec filtrage par type (parking, station, etc)")],
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("- Clustering incidents et heatmap optimisée")],
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 120 },
        }),

        new Paragraph({
          children: [new TextRun("🟡 MOYEN TERME (Semaines 2-4)")],
          spacing: { before: 120, after: 60 },
        }),
        new Paragraph({
          children: [new TextRun("- Caching API responses + mises à jour toutes les 5 min")],
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("- Stats panel avec tendances par zone")],
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 240 },
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("6. Estimation ressources")],
        }),

        createResourceTable(),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("7. Points clés à retenir")],
        }),

        new Paragraph({
          children: [new TextRun("✓ Les APIs sont déjà configurées - il faut juste les connecter à la UI")],
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("✓ Performance sera l'enjeu principal pour N+ couches")],
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("✓ Utiliser Mapbox clustering + WebGL pour scalabilité")],
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("✓ Mettre en cache agressivement côté client")],
          numbering: { reference: "bullets", level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("✓ Prioriser UX des layers toggle et filtrage")],
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 240 },
        }),
      ],
    },
  ],
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: "bullet",
            text: "•",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: { indent: { left: 720, hanging: 360 } },
            },
          },
        ],
      },
      {
        reference: "numbers",
        levels: [
          {
            level: 0,
            format: "decimal",
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: { indent: { left: 720, hanging: 360 } },
            },
          },
        ],
      },
    ],
  },
});

function createTable(data) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const headerShading = { fill: "D5E8F0", type: ShadingType.CLEAR };

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2340, 2340, 4680],
    rows: [
      new TableRow({
        children: data[0].map((cell) =>
          new TableCell({
            borders,
            shading: headerShading,
            width: { size: 3120, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: cell, bold: true })] })],
          })
        ),
      }),
      ...data.slice(1).map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  borders,
                  width: { size: 3120, type: WidthType.DXA },
                  children: [new Paragraph({ children: [new TextRun(cell)] })],
                })
            ),
          })
      ),
    ],
  });
}

function createPriorityTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1872, 2340, 2340, 2808],
    rows: [
      new TableRow({
        children: ["Priorité", "Fonctionnalité", "Effort", "Impact"].map(
          (cell) =>
            new TableCell({
              borders,
              shading: { fill: "2E75B6", type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cell, bold: true, color: "FFFFFF" })],
                }),
              ],
            })
        ),
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            children: [new Paragraph({ children: [new TextRun("🔴 P1")] })],
          }),
          new TableCell({
            borders,
            children: [new Paragraph({ children: [new TextRun("Weather layer")] })],
          }),
          new TableCell({
            borders,
            children: [new Paragraph({ children: [new TextRun("2h")] })],
          }),
          new TableCell({
            borders,
            children: [new Paragraph({ children: [new TextRun("Essentiel pour smart city")] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            children: [new Paragraph({ children: [new TextRun("🔴 P1")] })],
          }),
          new TableCell({
            borders,
            children: [new Paragraph({ children: [new TextRun("POI clustering")] })],
          }),
          new TableCell({
            borders,
            children: [new Paragraph({ children: [new TextRun("4h")] })],
          }),
          new TableCell({
            borders,
            children: [new Paragraph({ children: [new TextRun("Visibilité complète urbaine")] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            children: [new Paragraph({ children: [new TextRun("🟠 P2")] })],
          }),
          new TableCell({
            borders,
            children: [new Paragraph({ children: [new TextRun("API caching")] })],
          }),
          new TableCell({
            borders,
            children: [new Paragraph({ children: [new TextRun("3h")] })],
          }),
          new TableCell({
            borders,
            children: [new Paragraph({ children: [new TextRun("Performance 10x")] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            children: [new Paragraph({ children: [new TextRun("🟠 P2")] })],
          }),
          new TableCell({
            borders,
            children: [new Paragraph({ children: [new TextRun("IA anomalies")] })],
          }),
          new TableCell({
            borders,
            children: [new Paragraph({ children: [new TextRun("6h")] })],
          }),
          new TableCell({
            borders,
            children: [new Paragraph({ children: [new TextRun("Prédictions alertes")] })],
          }),
        ],
      }),
    ],
  });
}

function createResourceTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2808, 2340, 2340, 1872],
    rows: [
      new TableRow({
        children: ["Composant", "Taille code", "Temps impl.", "Risques"].map(
          (cell) =>
            new TableCell({
              borders,
              shading: { fill: "70AD47", type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cell, bold: true, color: "FFFFFF" })],
                }),
              ],
            })
        ),
      }),
      new TableRow({
        children: [
          new TableCell({ borders, children: [new Paragraph({ children: [new TextRun("Weather Layer")] })] }),
          new TableCell({ borders, children: [new Paragraph({ children: [new TextRun("~500 lignes")] })] }),
          new TableCell({ borders, children: [new Paragraph({ children: [new TextRun("2-3h")] })] }),
          new TableCell({ borders, children: [new Paragraph({ children: [new TextRun("API quota")] })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ borders, children: [new Paragraph({ children: [new TextRun("POI Clustering")] })] }),
          new TableCell({ borders, children: [new Paragraph({ children: [new TextRun("~1000 lignes")] })] }),
          new TableCell({ borders, children: [new Paragraph({ children: [new TextRun("4-6h")] })] }),
          new TableCell({ borders, children: [new Paragraph({ children: [new TextRun("Perf mémoire")] })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ borders, children: [new Paragraph({ children: [new TextRun("API Caching")] })] }),
          new TableCell({ borders, children: [new Paragraph({ children: [new TextRun("~800 lignes")] })] }),
          new TableCell({ borders, children: [new Paragraph({ children: [new TextRun("3-4h")] })] }),
          new TableCell({ borders, children: [new Paragraph({ children: [new TextRun("Staleness")] })] }),
        ],
      }),
    ],
  });
}

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("/sessions/dazzling-hopeful-volta/mnt/dashboard.crossflow-mobility/AUDIT_MAP_ENRICHISSEMENT.docx", buffer);
  console.log("✅ Audit document créé avec succès!");
});
