# CrossFlow Unified Control Room Interface
## Complete Implementation Plan

---

## 🎯 VISION
Transform CrossFlow from a dashboard into a **real-time urban decision cockpit** where:
- Map is the source of truth (center, 70% of screen)
- Left panel provides intelligent controls and insights (30%)
- All data layers fused into single coherent experience
- One interaction = one decision
- Visual connections between UI elements

---

## 📐 ARCHITECTURE OVERVIEW

### HIGH-LEVEL LAYOUT
```
┌─────────────────────────────────────────────────────┐
│ Header (fixed): City selector, Mode, Help           │
├──────────────────┬──────────────────────────────────┤
│  LEFT PANEL      │                                  │
│  (30%)           │     UNIFIED MAP (70%)            │
│  [Controls]      │                                  │
│  [Insights]      │  - Roads (vector)               │
│  [Timeline]      │  - Traffic flow (animated)      │
│  [Incidents]     │  - Incidents (pins + pop-ups)   │
│  [Transport]     │  - Transport lines (highlights) │
│  [Simulation]    │  - Predictions (future zones)   │
│                  │  - Simulation overlay           │
├──────────────────┴──────────────────────────────────┤
│ Footer: Legend, Data source, Performance metrics    │
└─────────────────────────────────────────────────────┘
```

### RESPONSIVE BEHAVIOR
- **Desktop (≥1024px)**: Split panel as above
- **Tablet (768-1023px)**: Stacked (map top 60%, panel bottom 40%)
- **Mobile (<768px)**: Fullscreen map + bottom sheet (like Uber/Maps)

---

## 🧩 COMPONENT BREAKDOWN

### LEFT PANEL COMPONENTS (Top to Bottom)

#### 1. **ControlRoomStatus** - Global Network State
- Network status (NORMAL/TENSION/CRITICAL)
- Average congestion %
- Active incidents count
- Transport load average
- AI prediction summary
- Trend indicator (up/down/stable)

#### 2. **CriticalEventsPanel** - High-Impact Events
- Max 5 items (sorted by impact)
- Each shows: severity badge + location + label
- Click → zoom map + highlight
- Auto-refresh on data update

#### 3. **PredictionTimeline** - Interactive Time Slider
- Timeline buttons: [NOW] [+15m] [+30m] [+1h]
- When slider moves:
  - Heatmap updates to show FUTURE congestion
  - Panel shows predicted incidents
  - Confidence level displayed
  - Affected transport lines highlighted

#### 4. **TransportOverview** - Tabbed Public Transit
- Tabs: [Metro] [RER] [Tram] [Bus]
- Show top 5 busiest lines per mode
- Each card: load % + status + next vehicle time
- Hover → highlight line on map
- Click → zoom to line + show details

#### 5. **SmartIncidentFeed** - Sorted Incidents
- Auto-sorted by impact score
- Max 8 items visible (scrollable)
- Each: type + road + location + severity
- Dismiss button available
- Click → zoom map + open details

#### 6. **SimulationPanel** - Scenario Testing
- Collapse/expand toggle
- Pre-defined scenarios: Road closure, Event, Weather, Custom
- "Run simulation" button
- Shows results: impact zones, affected time, recommendations

---

## 🗺️ MAP SYSTEM

### LAYER STACK
```
1. Base map (CartoDB)
2. Road network (vector)
3. Heatmap (congestion/passages/CO2)
4. Traffic flow arrows (animated)
5. Incidents (pins + glows)
6. Transport lines (highlighted on hover)
7. Prediction zones (translucent future)
8. Simulation overlay (if running)
9. Selection highlights
10. Controls (top UI)
```

### CRITICAL: VISUAL CONNECTIONS
- Incident card hover → pin glows on map
- Transport line hover → line thickens on map
- Timeline slider → heatmap morphs to future state
- Simulation run → congestion spreads on map
- Any click → map zooms + highlights related area

---

## 🧠 STATE MANAGEMENT

### NEW STORES REQUIRED

**controlRoomStore**
- networkStatus, avgCongestion, criticalEvents
- transportTab, hoveredLineId, selectedItem
- selectedTimeOffset, dismissedIncidents
- simulationScenario, isSimulating

**transportStore**
- metroLines, rerLines, tramLines, busLines
- selectedLineId, hoveredLineId
- minLoadPercent filter

**predictionStore**
- predictions (Map of time offset → zones)
- isFetching, lastFetchedAt
- Methods: fetchPredictions(), getPrediction(minutes)

---

## ⚙️ INTERACTION FLOWS

### INCIDENT INTERACTION
```
User hovers incident card
  → Incident pin glows on map
  → Affected roads highlight
  → Details pane shows impact

User clicks incident
  → Map zooms to location (zoom 14)
  → Detail panel slides up (mobile) / expands (desktop)
  → Shows related data:
    - Estimated delay
    - Other incidents on same road
    - Affected transport lines
    - Future prediction impact
```

### TIMELINE INTERACTION
```
User moves prediction slider to +30m
  → Fetch prediction data for +30m
  → Heatmap updates with future congestion
  → Future impact zones PULSE on map
  → Incident feed updates with +30m incidents
  → Transport load updates
  → Confidence level displayed
```

### SIMULATION INTERACTION
```
User selects scenario (e.g., "Road closure on A13")
  → Clicks "Run simulation"
  → Map animates congestion spread
  → Shows impact timeline
  → Highlights affected zones
  → Estimates passenger impact
  → Shows recommended actions

User can "Undo" or "Adjust" scenario
```

---

## 📋 IMPLEMENTATION ROADMAP

### PHASE 1: Foundation
- [ ] Create controlRoomStore
- [ ] Build ControlRoomStatus component
- [ ] Build CriticalEventsPanel component
- [ ] Integrate incident highlighting on map
- [ ] Set up responsive layout

### PHASE 2: Core Features
- [ ] Build PredictionTimeline component
- [ ] Integrate prediction data source
- [ ] Build TransportOverview component
- [ ] Create transportStore
- [ ] Add transport line highlighting

### PHASE 3: Advanced Features
- [ ] Build SmartIncidentFeed component
- [ ] Build SimulationPanel component
- [ ] Implement simulation visualization
- [ ] Add all hover/click effects

### PHASE 4: Polish
- [ ] Mobile bottom sheet design
- [ ] Tablet responsive layout
- [ ] Performance optimization (virtualization, caching)
- [ ] Accessibility audit

---

## 🚀 LAUNCH CHECKLIST

User Experience:
- [ ] Understand city status in <2 seconds
- [ ] See critical issues instantly
- [ ] Predict with timeline slider
- [ ] Control transport info
- [ ] Run simulations
- [ ] All UI connected to map

Performance:
- [ ] First interaction <200ms
- [ ] Panel scroll 60fps
- [ ] Map updates 60fps
- [ ] No fetch delay >1s

