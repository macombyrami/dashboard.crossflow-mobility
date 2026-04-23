# PRD - CrossFlow Mobility

Date: 2026-04-16
Version: 1.0
Scope: Dashboard web CrossFlow Mobility

## 1. Vision produit

CrossFlow Mobility est une plateforme de pilotage de la mobilite urbaine en temps reel. Le produit centralise des flux trafic, transport, incidents, signalements sociaux, meteo et qualite de l'air pour aider les collectivites et partenaires a:

- comprendre l'etat courant du reseau urbain
- anticiper les congestions et perturbations
- simuler des scenarios operatifs
- produire des recommandations et exports exploitables

Le produit est positionne comme un dashboard d'intelligence urbaine et de prediction, avec une experience web premium, un usage desktop prioritaire, et une version mobile adaptee aux operations terrain.

## 2. Problematique a resoudre

Les equipes mobilite et exploitation travaillent souvent avec des sources dispersees:

- trafic routier en temps reel
- incidents et perturbations transport
- evenements urbains ou reseaux sociaux
- meteo et pollution
- indicateurs de performance de reseau

Le besoin est de convertir ces signaux hétérogènes en une vue operationnelle unique, avec un niveau de confiance, des tendances, des alertes et des actions recommandées.

## 3. Objectifs produit

### Objectifs principaux

- fournir une vue temps reel de la mobilite d'une ville
- afficher des KPIs lisibles sur congestion, temps de trajet, pollution et incidents
- proposer une couche de prediction a horizon court terme
- permettre la simulation de scenarios et la comparaison avant/apres
- rendre les signaux sociaux et transport interopérables dans un meme espace

### Objectifs secondaires

- soutenir le travail des analysts, exploitants et responsables de reseau
- faciliter la communication interne via export PDF, partage et snapshots
- offrir une base multi-villes avec Paris comme configuration par defaut

## 4. Perimetre fonctionnel

### Inclus

- landing page marketing et entree produit
- dashboard KPI
- carte live multi-couches
- analyse prediction
- simulation de trafic et d'impact
- monitoring technique
- hub transport
- hub social
- consultant IA / assistant d'aide a la decision
- export et partage

### Exclu pour la version actuelle

- reservation ou billetterie
- optimisation de tournées logistiques
- navigation grand public de type GPS
- facturation et gestion commerciale
- edition collaborative multi-utilisateur temps reel

## 5. Utilisateurs cibles

### 5.1 Collectivite / metropole

- suit les KPI urbains et les zones a risque
- pilote des scenarios de circulation
- prepare des briefings pour decision politique ou operationnelle

### 5.2 Exploitant trafic / mobilite

- analyse les incidents et anomalies
- identifie les segments critiques
- compare l'etat nominal et l'etat simule

### 5.3 Analyste data / smart city

- observe les tendances historiques
- exploite les snapshots et exports
- croise plusieurs sources de donnees

### 5.4 Partenaire institutionnel

- consulte une vue simplifiee du reseau
- suit les alertes et la pression reseau
- accede a des rapports partageables

## 6. Proposition de valeur

- Une seule interface pour le trafic, les transports, la prediction et la simulation.
- Un moteur de synthese qui transforme des signaux multi-sources en lecture operationnelle.
- Un niveau de detail adapte au pilotage urbain, avec une experience visuelle forte.
- Une architecture multi-villes et multi-sources pour elargir la couverture sans refondre le produit.

## 7. Modules produit

### 7.1 Landing page

Rolle:

- presenter le positionnement CrossFlow
- qualifier l'acces interne
- mettre en avant la promesse de souverainete, prediction et interopérabilite

Contenu attendu:

- hero narratif
- grille des fonctionnalites
- indicateurs d'impact
- call-to-action vers connexion

### 7.2 Dashboard

Rolle:

- afficher un resume operationnel de la ville selectionnee
- suivre congestion, retard moyen, impact sanitaire et cout incidents
- visualiser les evolutions de 24h via historique de snapshots

Fonctionnalites:

- cartes KPI dynamiques
- bandeau d'etat reseau
- timeline de playback
- chart trafic
- widget de stabilite
- split modal
- meteo et qualite de l'air
- flux incidents et evenements
- export PDF
- partage de la vue

### 7.3 Carte live

Rolle:

- servir de vue centrale de navigation et d'analyse
- superposer trafic, heatmap, incidents, transport, prediction et perimetre

Fonctionnalites:

- calques activables
- carte de chaleur
- detail d'arc ou de zone
- split predictif
- filtres vehicules
- info vehicule
- panneau IA lateral
- adaptation mobile via bottom sheets

### 7.4 Prediction

Rolle:

- estimer la pression trafic a horizon court terme
- expliquer les facteurs qui influencent la projection

Fonctionnalites:

- multiplicateur global de congestion
- niveau de confiance
- decomposition par calendrier, evenements, transports, meteo, qualite de l'air, saisonnalite
- projection a +15, +30, +60 et +120 minutes
- recommandations de strategie
- collecte de feedback utilisateur sur la pertinence de la prediction

### 7.5 Simulation

Rolle:

- tester des scenarios d'incident et mesurer leur impact
- comparer route normale et route simulee

Fonctionnalites:

- configuration de scenarios
- etat du backend predictif
- statistiques reseau IDF
- resultat de simulation
- flux social associe
- moteur d'agents IA interne

### 7.6 Social / incidents

Rolle:

- capter les signaux faibles et confirmations d'incidents
- croiser social, Sytadin, RATP et signalements locaux

Fonctionnalites:

- feed X / social pulse
- incidents locaux
- intelligence sociale synthétisee
- anomalies
- recommandations d'actions
- vue reseau RATP / Transilien

### 7.7 Transport

Rolle:

- fournir une lecture du reseau de transport en commun
- estimer charge, frequence et perturbations

Fonctionnalites:

- synthese lignes actives
- charge moyenne
- perturbations
- filtrage par type de ligne
- cartes de lignes par reseau
- intelligence transport

### 7.8 Monitoring

Rolle:

- surveiller l'etat technique et les couts operationnels

Fonctionnalites:

- volume de requetes
- cache hit ratio
- score de prediction
- erreurs API
- cout d'usage estime
- journal de logs

## 8. Parcours utilisateurs critiques

### Parcours 1 - Lecture rapide de l'etat de la ville

1. l'utilisateur ouvre le dashboard
2. la ville active se charge
3. les KPI et le statut reseau s'affichent
4. l'utilisateur identifie la pression reseau et les incidents actifs

### Parcours 2 - Analyse d'un incident

1. l'utilisateur ouvre la carte
2. il active les calques incidents et trafic
3. il inspecte le segment ou la zone critique
4. il consulte les sources sociales et transport
5. il exporte la vue ou partage la session

### Parcours 3 - Preparation d'une decision

1. l'utilisateur ouvre Prediction
2. il lit le facteur global et les signaux
3. il compare plusieurs horizons
4. il choisit une recommandation operationnelle

### Parcours 4 - Test d'un scenario

1. l'utilisateur ouvre Simulation
2. il choisit un scenario ou place un evenement
3. il lance le calcul
4. il compare les resultats avant/apres
5. il consulte les impacts via carte et resultats

## 9. Exigences fonctionnelles

### FR1 - Gestion de la ville active

- l'utilisateur peut changer de ville parmi les villes configurees
- Paris est la ville par defaut
- les vues, KPI et signaux se recalculent selon la ville active

### FR2 - Donnees temps reel

- le produit doit rafraichir les donnees sans rechargement complet
- les widgets doivent afficher des etats de chargement et d'erreur
- les donnees critiques doivent survivre a des degradations partielles de source

### FR3 - Calcul KPI

- le dashboard doit calculer congestion, temps de trajet, pollution et incidents
- les KPI doivent etre comparables dans le temps
- une lecture historique doit etre disponible via snapshots

### FR4 - Prediction explicable

- chaque score doit montrer ses facteurs de contribution
- la confiance doit etre visible
- les projections temporelles doivent etre lisibles

### FR5 - Simulation de scenarios

- un utilisateur doit pouvoir configurer et lancer un scenario
- la simulation doit modifier la lecture du reseau
- le produit doit permettre la comparaison avant/apres

### FR6 - Cartographie interactive

- les calques doivent pouvoir etre actives ou desactives
- les zones et segments doivent etre inspectables
- la carte doit rester utilisable sur mobile et desktop

### FR7 - Exports et partage

- le dashboard doit pouvoir generer un PDF
- l'utilisateur doit pouvoir partager une vue ou un lien
- les exports doivent inclure le contexte utile a la lecture

### FR8 - IA d'aide a la decision

- un assistant doit pouvoir resumer la situation
- l'assistant doit utiliser le contexte de la ville, des KPI et des incidents
- les reponses doivent rester orientees action

## 10. Donnees et integrations

### Sources identifiees dans le projet

- TomTom traffic flow et incidents
- HERE
- OpenWeather / OpenMeteo
- Navitia
- ORS
- Overpass / OpenStreetMap
- Sytadin
- RATP
- SNCF / Transilien
- PredictHQ
- Ticketmaster
- signaux sociaux et scraping interne
- backend predictif Python via proxy Next.js
- snapshots et historique KPI
- Supabase pour l'authentification et certaines persistance/guard rails

### Principes d'integration

- cache local et deduplication des appels lourds
- degradation gracieuse en cas d'indisponibilite d'une source
- proxy server-side pour proteger les cles API
- separation entre donnees live, donnees simulees et donnees historiques

## 11. Metrics de succes

### Produit

- taux d'activation des utilisateurs internes
- temps moyen pour identifier un incident critique
- taux d'utilisation des vues dashboard, carte, prediction et simulation
- taux d'export PDF ou partage
- taux de retour utilisateur sur les predictions

### Qualite de service

- latence moyenne d'actualisation des widgets
- taux de reussite des appels API critiques
- taux de cache hit
- temps de chargement initial

### Valeur metier

- reduction du temps de diagnostic
- reduction du temps de preparation des briefings
- meilleure priorisation des zones a risque
- meilleure anticipation des congestions

## 12. Contraintes

- acces restrain aux municipalites et partenaires certifies
- dependance a plusieurs API externes
- couverture des donnees variable selon les villes
- simulation en memoire pour la version actuelle
- experience mobile a conserver sans perdre les fonctions critiques

## 13. Risques

- indisponibilite d'une source externe
- incoherence entre donnees live, predites et simulees
- surcharge cognitive si trop de couches sont visibles en meme temps
- couts API si le cache ou la limitation ne sont pas suffisants
- perception excessive de precision si la confiance n'est pas bien affichee

## 14. Hors perimetre immediat

- routage temps reel pour grand public
- apprentissage automatique totalement autonome sans supervision
- comptabilite de couts client final
- multi-tenant commercial complet
- edition collaborative temps reel de scenarios

## 15. Roadmap proposee

### Phase 1 - Stabilisation

- fiabiliser les sources critiques
- consolider le cache et le monitoring
- uniformiser les etats de chargement et d'erreur

### Phase 2 - Extension fonctionnelle

- enrichir les projections a plus long terme
- ajouter des exports supplementaires
- ameliore les comparaisons historiques

### Phase 3 - Plateforme

- etendre a davantage de villes
- renforcer la persistance des scenarios
- ouvrir une couche collaborative et des workflows de validation

## 16. Definition of Done

Le produit est considere conforme a ce PRD si:

- un utilisateur peut ouvrir une ville et lire son etat operationnel en moins de quelques secondes
- les KPI principaux sont calcules et coherents avec la ville active
- la prediction affiche un score explicable avec confiance et horizons
- la simulation permet de comparer au moins un scenario avant/apres
- la carte reste exploitable sur desktop et mobile
- les sources externes critiques disposent d'un mode de degradation propre
- le dashboard propose un export ou un partage de la vue

## 17. Notes de cadrage

- Ce PRD decrit le produit tel qu'il est structure dans le depot actuel.
- Les valeurs d'impact affichees dans le marketing doivent etre validees avant usage externe.
- Les donnees operationnelles doivent etre distinguees des donnees de demo ou de fallback.
- La priorite produit actuelle est l'aide a la decision urbaine, pas le grand public.
