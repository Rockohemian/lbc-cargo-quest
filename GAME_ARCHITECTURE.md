# GAME_ARCHITECTURE

Det här dokumentet beskriver hur LBC Cargo Quest är uppbyggt i nuläget, utan att ändra någon kod. Fokus ligger på faktisk implementation i källan: entrypoints, stateflöde, lastsäkring, scoring, mobilinteraktion, layout och de största riskerna.

## Teknisk Översikt

Projektet är ett React-spel byggt med TypeScript och Vite. Det använder Zustand för globalt state, Tailwind för layout, Framer Motion för animationer, Leaflet för kartan, Three.js/React Three Fiber för truckvisualisering och Supabase för leaderboard och adminflöde.

Viktiga entrypoints och grundfiler:

- [src/App.tsx](src/App.tsx#L17) är den övergripande skärmcontainern.
- [src/main.tsx](src/main.tsx#L7) bootstrappas appen och blockerar iOS-rubberband samt dubbel-tap zoom utanför explicita scrollområden.
- [src/index.css](src/index.css#L1) innehåller globala höjd-, scroll- och mobilregler samt Leaflet- och safe-area-justeringar.
- [package.json](package.json#L1) definierar dev/build/fair-skript.

Teknikstacken syns också i [package.json](package.json#L1): React 18, TypeScript 5.4, Vite, Zustand, Tailwind CSS, Framer Motion, Leaflet, React Leaflet, Three.js, React Three Fiber och Supabase.

## Mappstruktur

Den relevanta strukturen är ganska ren och uppdelad efter ansvar:

- `src/components/screens/` innehåller hela spelets skärmar.
- `src/components/game/` innehåller visuella spellayouter som truck och trailer.
- `src/components/ui/` innehåller återanvändbara UI-byggblock som knapp, glasscard, scrollindikator och progressbar.
- `src/components/garage/` innehåller garage-popup och unlock-overlay.
- `src/store/` innehåller globalt game state.
- `src/utils/` innehåller generering, lastmotor och scoring.
- `src/data/` innehåller cargo-, event- och garagekataloger.
- `src/hooks/` innehåller geolocation-hooken.
- `src/lib/` innehåller Supabase-klienten.
- `public/` och `scripts/` innehåller stöd för fair/event assets.

## Skärmföljd Och Nivåer

Spelet är inte uppbyggt som klassiska nivåer med separata banor i kod. I stället växlar det mellan skärmar och ett par tydliga lägen:

- Start och profilering på splash.
- Karta med GPS-baserad insamling.
- Insamlingsmodal för ett valt kolli.
- Lastningsskärm med två faser: placera last och säkra last.
- Transportsimulering med händelser, rörelse och skaderisk.
- Resultatskärm med poäng, medaljer och Supabase-inmatning.
- Profil, garage, leaderboard, admin och dev-konsol som sidolägen.

Det som närmast fungerar som ”banor” är:

- Karta med fri spawn runt spelaren i normal läge, eller runt event-venue i mässläge.
- Eventbanan i [src/data/events.ts](src/data/events.ts#L11), där cargo är låst till Färjestad travbana.
- Transportsträckan i [src/components/screens/TransportScreen.tsx](src/components/screens/TransportScreen.tsx#L52), där målet väljs slumpmässigt från en fast destinationlista.

Det som närmast fungerar som ”nivåer” är:

- Spelarens level/rank i Zustand-store och på result/profile/hud.
- Garage-upplåsning via lifetime points.
- Crate-tier per nivåuppgång.

## Spelflöde Från Start Till Resultat

Textflöde:

```text
Splash
  -> sätt namn / event-mode / starta omgång
  -> generera cargo runt playerPosition
  -> setScreen('map')

Map
  -> visa markörer för gods, spelare och rivaler
  -> välj gods inom collect-radien
  -> setScreen('collect')

Collect
  -> collectCargo(id)
  -> inventory växer
  -> setScreen('map')

Map igen
  -> fortsätt samla tills last är tillräcklig
  -> setScreen('loading')

Loading
  -> fas 1: placera last i grid
  -> fas 2: säkra last med spännband / nät / mellanvägg
  -> setLoadPlan(...)
  -> setScreen('delivery')

Transport
  -> simulera körning och skadehändelser
  -> calcRoundResult(loadPlan, targetDamage)
  -> finishRound(result)
  -> setScreen('result')

Result
  -> visa poäng, grade, badges och Supabase-submit
  -> ny omgång eller profil
```

## Komponentträd

```text
App
├─ HUD
├─ AnimatePresence
│  ├─ SplashScreen
│  ├─ MapScreen
│  ├─ CollectScreen
│  ├─ LoadingScreen
│  ├─ TransportScreen
│  ├─ ResultScreen
│  ├─ ProfileScreen
│  ├─ GarageScreen
│  ├─ LeaderboardScreen
│  ├─ AdminScreen
│  └─ DevConsoleScreen
└─ GarageUnlockOverlay
```

`App` låser hela spelvärlden till en mobilram i mitten av viewporten och begränsar alla skärmar till den containern via en transformed ancestor. Det är gjort i [src/App.tsx](src/App.tsx#L17).

## State Och Dataflöde

Globalt state ligger i Zustand i [src/store/gameStore.ts](src/store/gameStore.ts#L70). Store:n håller bland annat:

- aktuell skärm,
- playerprofil,
- position,
- cargoItems på kartan,
- inventory,
- selectedCargo,
- loadPlan,
- lastResult,
- garage-state,
- testMode och eventMode.

Det som persisteras till localStorage är bara `player`, `testMode` och `garage` via `persist(..., { name: 'lcq-v1', partialize: ... })`. Skärm, inventory, loadPlan och lastResult återställs alltså inte vid reload.

Hur data rör sig mellan komponenter:

- [src/components/screens/SplashScreen.tsx](src/components/screens/SplashScreen.tsx#L9) sätter namn, genererar cargo och skickar spelaren till kartan.
- [src/components/screens/MapScreen.tsx](src/components/screens/MapScreen.tsx#L126) läser playerPosition, cargoItems och inventory, och öppnar collect-modalen när ett kolli väljs.
- [src/components/screens/CollectScreen.tsx](src/components/screens/CollectScreen.tsx#L1) använder selectedCargo och collectCargo.
- [src/components/screens/LoadingScreen.tsx](src/components/screens/LoadingScreen.tsx#L28) använder inventory som lokal kö, bygger placed items och skriver tillbaka hela loadPlan till store:n.
- [src/components/screens/TransportScreen.tsx](src/components/screens/TransportScreen.tsx#L52) läser loadPlan och skapar slutresultat.
- [src/components/screens/ResultScreen.tsx](src/components/screens/ResultScreen.tsx#L12) läser lastResult, player och garage, och kan skapa ny omgång eller skicka till Supabase.
- [src/components/layout/HUD.tsx](src/components/layout/HUD.tsx#L3) läser player, screen och inventory för toppraden.

## Lastmodell Och Beräkningar

Lastningsmotorn finns i [src/utils/loadEngine.ts](src/utils/loadEngine.ts#L1). Den arbetar helt grid-baserat, inte med fysikmotor.

Trailergriden är:

- 12 kolumner,
- 6 rader,
- totalt 72 celler.

Det viktiga här är att `cols` betyder längd i trailer-riktningen och `rows` betyder höjd. Gridens vänsterkant är framstam och högerkant bakdörrar.

### Placering

Följande funktioner styr placering:

- `isFree(...)` kontrollerar att footprint inte går utanför eller överlappar andra kollin.
- `settleRow(...)` applicerar gravitation och placerar kollit på golv eller ovanpå den högsta underliggande stacken.

I [src/components/screens/LoadingScreen.tsx](src/components/screens/LoadingScreen.tsx#L88) gör `computeGhost(...)` följande:

1. Den räknar om pointerposition till gridkolumn.
2. Den provar först den avsedda kolumnen.
3. Om den inte fungerar snappas den till närmaste giltiga kolumn inom fyra steg.
4. Om ingen plats går att hitta visas en röd invalid ghost på golvet.

Det här betyder att ett kolli anses ”bra placerat” när `settleRow` hittar en fri position och ghosten blir valid. Ett kolli anses ”dåligt placerat” när ghosten blir invalid eller när layouten ger dålig balans, hög tyngdpunkt eller överlapp.

### Fyllnadsgrad, Viktfördelning Och Tyngdpunkt

`computeMetrics(...)` räknar:

- `fillPercent` = använda celler / 72, avrundat och clampat till 0–100.
- `weightBalance` = 100 minus en penalty från avvikelse i center of mass. Den ideala kolumnen är 5.76, alltså något framåtlutat. Rear-heavy last straffas hårdare med multiplikator 1.4.
- `cogHeight` = viktad genomsnittlig höjd över golv, normaliserad till 0–100 där högre betyder sämre stabilitet.
- `frontBias` = ett hjälpmått för riktning fram/bak.
- `securing` = resultatet från `computeSecuring(...)`.

### Lastsäkring

`computeSecuring(...)` i [src/utils/loadEngine.ts](src/utils/loadEngine.ts#L63) fungerar så här:

- Riskkolli är de som är höga, fragila, tunga eller inte stapelbara.
- Required straps beräknas som `max(1, riskItems.length)`.
- `strapCoverage = min(1, straps / required)`.
- Poäng: `strapCoverage * 58 + net * 12 + divider * 14`.
- Om det finns höga, ostapelbara kollin och för få spännband capas säkringen till max 55.

Det finns alltså ingen fysisk spännkraft, bara en scoremodell och en visuell representation.

## Lastsäkring I Dag

Lastsäkringen i UI finns i [src/components/screens/LoadingScreen.tsx](src/components/screens/LoadingScreen.tsx#L217) och [src/components/game/TrailerView.tsx](src/components/game/TrailerView.tsx#L38).

Nuvarande alternativ:

- Spännband: upp till 6 stycken, lagras som `strapYs: number[]`. De läggs via swipe över lastytan eller via knappen i verktygsraden. De påverkar score genom antal, inte genom exakta fästpunkter eller dragkraft.
- Lastnät: toggle `net: boolean`. Det ritas som ett statiskt mönster längst bak i trailern och ger bonuspoäng.
- Mellanvägg: toggle `divider: boolean`. Den ritas som en fast vertikal vägg ungefär vid mitten och ger bonuspoäng.

Det finns också en undo-funktion för senaste bandet.

Viktigt: nätet är inte flyttbart i dag. Det är en boolesk status med visuell overlay, inte ett interaktivt objekt.

## Poäng Och Resultat

Scoring ligger i [src/utils/scoring.ts](src/utils/scoring.ts#L3).

### Grade

`grade(totalPoints)` använder trösklarna:

- S: minst 3200
- A: minst 2200
- B: minst 1400
- C: minst 700
- D: under 700

### Slutresultat

`calcRoundResult(plan, cargoDamage)` räknar ut:

- `avgEco` = genomsnittlig ecoImpact per kolli.
- `ecoScore = fillPercent * 0.45 + (100 - avgEco * 10) * 0.35 + weightBalance * 0.2`.
- `safetyScore = securing * 0.4 + weightBalance * 0.25 + (100 - cogHeight) * 0.15 + (100 - cargoDamage) * 0.2`.
- `qualityScore = (100 - cargoDamage) * 0.6 + securing * 0.25 + weightBalance * 0.15`.
- `totalPoints = fillPercent * 9 + weightBalance * 7 + securing * 7 + safetyScore * 6 + ecoScore * 5 + qualityScore * 6 + cargoValue * 0.02 - cargoDamage * 14`.
- `totalXP = round(totalPoints * 0.4)`.

Resultatets badges ges när:

- fillPercent >= 80,
- weightBalance >= 88,
- securing >= 85,
- cargoDamage <= 4,
- ecoScore >= 85.

### Skadeberäkning Under Transport

`simulateDamage(plan)` räknar fram ett basvärde med:

- securingGap * 42,
- balanceGap * 26,
- cogRisk * 18,
- fragileShare * securingGap * 24.

Om lasten både är väl säkrad och välbalanserad multipliceras skadan med 0.35.

I [src/components/screens/TransportScreen.tsx](src/components/screens/TransportScreen.tsx#L92) multipliceras detta sedan med väder- och trafikrisk, alltså `base * (1 + weather.risk + traffic.risk)`.

## Hur Spelet Avgör Bra Och Dålig Last

Det finns flera lager av bedömning, inte bara ett enda boolean-värde.

I lastningsskärmen används följande gränser:

- load danger critical om `weightBalance < 25` eller `cogHeight > 75`.
- load danger warning om `weightBalance < 45` eller `cogHeight > 60`.
- secure danger critical om `securing < 20`.
- secure danger warning om `securing < 45`.

I transporten används `targetDamage` och en uppsättning instabila kollin för att animera rörelser, lutning och skadeindikering. Riskprofilen för ett kolli vägs upp av fragility, höjd, viktklass och position i trailern.

Det här betyder att:

- ”bra placerad” = platsen är valid, balansen är bra och tyngdpunkten är låg.
- ”dåligt placerat” = invalid ghost, dålig viktbalans eller hög tyngdpunkt.
- ”säkrad” = tillräckligt många band i förhållande till riskkollin, plus eventuellt nät och mellanvägg.
- ”osäkrad” = lågt securing-värde, särskilt under 20.

## Mobil, Drag-Drop Och Touch

Drag- och touchlogik ligger främst i [src/components/screens/LoadingScreen.tsx](src/components/screens/LoadingScreen.tsx#L88).

Nuvarande beteende:

- Palettkolli och placerade kolli startar drag med `pointerdown`.
- Under drag lyssnar skärmen globalt på `pointermove`, `pointerup` och `pointercancel`.
- En floating drag preview följer pekaren.
- Släpp commit: om ghosten är valid placeras eller flyttas kollit.
- `touch-none`, `data-drag-source` och global CSS blockerar native iOS-dragghost och textselektion.

I [src/main.tsx](src/main.tsx#L7) blockeras också `touchmove` på alla element som inte har `data-scroll`. Det är orsaken till att bara vissa inre pannor kan scrolla på mobil.

I secure-fasen används `pointerdown`/`pointerup` på trailer-ytan. En horisontell swipe med minst 40 px rörelse lägger till ett band på den Y-positionen där swipen startade. Det är alltså inte ett dragbart band, utan en gest som skapar ett nytt band.

## Layout, Höjd, Scroll Och Sticky

### Var Höjden Styrs

De viktigaste höjdreglerna ligger i [src/index.css](src/index.css#L1) och i skärmkomponenterna.

Globala regler:

- `html, body, #root { height: 100%; }`
- `html, body { overflow: hidden; overscroll-behavior: none; }`
- `body` har bakgrund, grid-overlay och fontinställningar.
- `.safe-area-top` och `.safe-area-bottom` finns som utilities.
- `.scrollbar-hide` döljer scrollbars.

Appens ytterram i [src/App.tsx](src/App.tsx#L17) är `fixed inset-0` med en mittcontainer som har `max-w-md`, `h-full`, `overflow-hidden` och `transform: translateZ(0)`.

### Sticky Och Scrollbara Ytor

Så här är det fördelat:

- HUD är fixed längst upp i [src/components/layout/HUD.tsx](src/components/layout/HUD.tsx#L3).
- Splash, map och loading har egna fullhöjdsytor med interna scrollområden eller fasta panels.
- Result, profile och garage använder `overflow-y-auto` och har egna `ScrollHint`-instanser.
- Leaderboard och admin är också scrollbara, men använder inte samma hint-komponent i nuläget.

`ScrollHint` finns i [src/components/ui/ScrollHint.tsx](src/components/ui/ScrollHint.tsx#L20). Den visar en liten pil när en scrollyta har mer innehåll nedanför. Den används i:

- [src/components/screens/ResultScreen.tsx](src/components/screens/ResultScreen.tsx#L228)
- [src/components/screens/ProfileScreen.tsx](src/components/screens/ProfileScreen.tsx#L188)
- [src/components/screens/GarageScreen.tsx](src/components/screens/GarageScreen.tsx#L265)

### Varför Lastsäkringssidan Kräver Scroll På Mobil

Lastningsskärmen är uppdelad i två faser i samma fullhöjdsvy, men i secure-fasen är innehållet större än den tillgängliga höjden på en vanlig mobil.

Orsaken är kombinationen av:

- fast header,
- trailerpreview med aspect ratio och begränsad maxhöjd,
- säkringsmätare,
- verktygsgrid,
- feedbackchips,
- footer med primär CTA.

Samtidigt är hela appen låst med `overflow: hidden` på body, så det finns bara den inre `overflow-y-auto`-ytan att använda. Resultatet blir att användaren måste scrolla för att nå allt på en normal 375 px bred mobilskärm.

Det finns dessutom ingen `ScrollHint` på loading-screen i dag, så scrollbehovet är mindre tydligt än på profile/result/garage.

## Relevanta Filer För Lastsäkringssteget

Kärnfiler:

- [src/components/screens/LoadingScreen.tsx](src/components/screens/LoadingScreen.tsx#L28)
- [src/components/game/TrailerView.tsx](src/components/game/TrailerView.tsx#L38)
- [src/utils/loadEngine.ts](src/utils/loadEngine.ts#L23)
- [src/utils/scoring.ts](src/utils/scoring.ts#L40)
- [src/types/index.ts](src/types/index.ts#L20)
- [src/store/gameStore.ts](src/store/gameStore.ts#L70)

Stödjande filer som påverkar lastsäkringsflödet indirekt:

- [src/components/screens/TransportScreen.tsx](src/components/screens/TransportScreen.tsx#L52)
- [src/components/screens/ResultScreen.tsx](src/components/screens/ResultScreen.tsx#L12)
- [src/components/ui/ScrollHint.tsx](src/components/ui/ScrollHint.tsx#L20)
- [src/index.css](src/index.css#L1)
- [src/components/layout/HUD.tsx](src/components/layout/HUD.tsx#L3)

## Viktiga Funktioner Och Ungefärliga Radpositioner

| Funktion | Fil | Rad |
|---|---|---:|
| `useGameStore` | [src/store/gameStore.ts](src/store/gameStore.ts#L70) | 70 |
| `isFree` | [src/utils/loadEngine.ts](src/utils/loadEngine.ts#L23) | 23 |
| `settleRow` | [src/utils/loadEngine.ts](src/utils/loadEngine.ts#L45) | 45 |
| `computeSecuring` | [src/utils/loadEngine.ts](src/utils/loadEngine.ts#L63) | 63 |
| `computeMetrics` | [src/utils/loadEngine.ts](src/utils/loadEngine.ts#L80) | 80 |
| `grade` | [src/utils/scoring.ts](src/utils/scoring.ts#L3) | 3 |
| `calcRoundResult` | [src/utils/scoring.ts](src/utils/scoring.ts#L40) | 40 |
| `simulateDamage` | [src/utils/scoring.ts](src/utils/scoring.ts#L105) | 105 |
| `LoadingScreen` | [src/components/screens/LoadingScreen.tsx](src/components/screens/LoadingScreen.tsx#L28) | 28 |
| `computeGhost` | [src/components/screens/LoadingScreen.tsx](src/components/screens/LoadingScreen.tsx#L88) | 88 |
| `autoArrange` | [src/components/screens/LoadingScreen.tsx](src/components/screens/LoadingScreen.tsx#L199) | 199 |
| `onSecurePointerDown` | [src/components/screens/LoadingScreen.tsx](src/components/screens/LoadingScreen.tsx#L216) | 216 |
| `onSecurePointerUp` | [src/components/screens/LoadingScreen.tsx](src/components/screens/LoadingScreen.tsx#L217) | 217 |
| `handleStartTransport` | [src/components/screens/LoadingScreen.tsx](src/components/screens/LoadingScreen.tsx#L230) | 230 |
| `TrailerViewBase` | [src/components/game/TrailerView.tsx](src/components/game/TrailerView.tsx#L38) | 38 |
| `TrailerView` | [src/components/game/TrailerView.tsx](src/components/game/TrailerView.tsx#L187) | 187 |
| `MapScreen` | [src/components/screens/MapScreen.tsx](src/components/screens/MapScreen.tsx#L126) | 126 |
| `handleCollect` | [src/components/screens/MapScreen.tsx](src/components/screens/MapScreen.tsx#L234) | 234 |
| `handleRespawn` | [src/components/screens/MapScreen.tsx](src/components/screens/MapScreen.tsx#L239) | 239 |
| `toggleMapTheme` | [src/components/screens/MapScreen.tsx](src/components/screens/MapScreen.tsx#L329) | 329 |
| `TransportScreen` | [src/components/screens/TransportScreen.tsx](src/components/screens/TransportScreen.tsx#L52) | 52 |
| `applyEvent` | [src/components/screens/TransportScreen.tsx](src/components/screens/TransportScreen.tsx#L92) | 92 |
| `startSim` | [src/components/screens/TransportScreen.tsx](src/components/screens/TransportScreen.tsx#L125) | 125 |
| `strapsToYs` | [src/components/screens/TransportScreen.tsx](src/components/screens/TransportScreen.tsx#L314) | 314 |
| `ResultScreen` | [src/components/screens/ResultScreen.tsx](src/components/screens/ResultScreen.tsx#L12) | 12 |
| `handleSubmitScore` | [src/components/screens/ResultScreen.tsx](src/components/screens/ResultScreen.tsx#L29) | 29 |
| `handlePlayAgain` | [src/components/screens/ResultScreen.tsx](src/components/screens/ResultScreen.tsx#L43) | 43 |
| `SplashScreen` | [src/components/screens/SplashScreen.tsx](src/components/screens/SplashScreen.tsx#L9) | 9 |
| `handleSecretTap` | [src/components/screens/SplashScreen.tsx](src/components/screens/SplashScreen.tsx#L24) | 24 |
| `handleSaveName` | [src/components/screens/SplashScreen.tsx](src/components/screens/SplashScreen.tsx#L62) | 62 |
| `handlePlay` | [src/components/screens/SplashScreen.tsx](src/components/screens/SplashScreen.tsx#L68) | 68 |
| `GarageScreen` | [src/components/screens/GarageScreen.tsx](src/components/screens/GarageScreen.tsx#L18) | 18 |
| `rotate` | [src/components/screens/GarageScreen.tsx](src/components/screens/GarageScreen.tsx#L32) | 32 |
| `onDragEnd` | [src/components/screens/GarageScreen.tsx](src/components/screens/GarageScreen.tsx#L36) | 36 |
| `partsForTab` | [src/components/screens/GarageScreen.tsx](src/components/screens/GarageScreen.tsx#L47) | 47 |
| `ProfileScreen` | [src/components/screens/ProfileScreen.tsx](src/components/screens/ProfileScreen.tsx#L10) | 10 |
| `handleNewRound` | [src/components/screens/ProfileScreen.tsx](src/components/screens/ProfileScreen.tsx#L19) | 19 |
| `handleExitToSplash` | [src/components/screens/ProfileScreen.tsx](src/components/screens/ProfileScreen.tsx#L25) | 25 |
| `HUD` | [src/components/layout/HUD.tsx](src/components/layout/HUD.tsx#L3) | 3 |
| `handleExit` | [src/components/layout/HUD.tsx](src/components/layout/HUD.tsx#L9) | 9 |
| `ScrollHint` | [src/components/ui/ScrollHint.tsx](src/components/ui/ScrollHint.tsx#L20) | 20 |
| `useGeolocation` | [src/hooks/useGeolocation.ts](src/hooks/useGeolocation.ts#L14) | 14 |
| `generateCargoField` | [src/utils/cargoGenerator.ts](src/utils/cargoGenerator.ts#L89) | 89 |
| `ensureMinimumCargoNearby` | [src/utils/cargoGenerator.ts](src/utils/cargoGenerator.ts#L150) | 150 |
| `generateEventCargoField` | [src/utils/cargoGenerator.ts](src/utils/cargoGenerator.ts#L221) | 221 |
| `getDistanceMeters` | [src/utils/cargoGenerator.ts](src/utils/cargoGenerator.ts#L19) | 19 |
| `stepToward` | [src/utils/cargoGenerator.ts](src/utils/cargoGenerator.ts#L30) | 30 |

## Hur De Viktigaste Skärmarna Är Byggda

### Splash

[src/components/screens/SplashScreen.tsx](src/components/screens/SplashScreen.tsx#L9) hanterar namnval, event-mode och start av ny omgång. Den genererar cargo genom [src/utils/cargoGenerator.ts](src/utils/cargoGenerator.ts#L89) och går till kartan med `setScreen('map')`.

### Map

[src/components/screens/MapScreen.tsx](src/components/screens/MapScreen.tsx#L126) är den centrala spelvyn. Den visar kartan, GPS-position, cargo-markörer, rivaler och samlingsknapp.

Cargo spawnas antingen runt spelaren eller runt event-venue beroende på eventMode. Första GPS-fixet kan regenerera spawns runt den faktiska positionen. `ensureMinimumCargoNearby` fyller på världen så att spelaren alltid har något att göra.

### Collect

[src/components/screens/CollectScreen.tsx](src/components/screens/CollectScreen.tsx#L1) är en modal med cargo-detaljer, vikt, XP, volym och lasttips. När användaren trycker på samla körs `collectCargo` och skärmen återgår till kartan.

### Loading

[src/components/screens/LoadingScreen.tsx](src/components/screens/LoadingScreen.tsx#L28) är delad i två faser:

- `place`: bygg last i grid.
- `secure`: säkra lasten och skicka vidare.

Den skärmen innehåller den mesta logiken för drag-and-drop, rotation, automatisk lastning, säkringsgest och commit av `loadPlan`.

### Transport

[src/components/screens/TransportScreen.tsx](src/components/screens/TransportScreen.tsx#L52) simulerar körningen. Den väljer väder, trafik och destination, beräknar skaderisk och spelar upp rörelser i trailern med `TrailerView`.

### Result

[src/components/screens/ResultScreen.tsx](src/components/screens/ResultScreen.tsx#L12) visar grade, totalpoäng, delpoäng, badges och spelprogres­sion. Här finns också Supabase-submit för score och telefonnummer.

### Profile, Garage, Leaderboard, Admin, Dev

De här skärmarna är främst meta-/progressionsvyer och använder samma store, men med olika fokus:

- [src/components/screens/ProfileScreen.tsx](src/components/screens/ProfileScreen.tsx#L10)
- [src/components/screens/GarageScreen.tsx](src/components/screens/GarageScreen.tsx#L18)
- [src/components/screens/LeaderboardScreen.tsx](src/components/screens/LeaderboardScreen.tsx#L1)
- [src/components/screens/AdminScreen.tsx](src/components/screens/AdminScreen.tsx#L1)
- [src/components/screens/DevConsoleScreen.tsx](src/components/screens/DevConsoleScreen.tsx#L1)

## Nuvarande Funktionslogik För Lastsäkring Och Visuellt Stöd

`TrailerView` i [src/components/game/TrailerView.tsx](src/components/game/TrailerView.tsx#L38) ritar:

- trailerkropp,
- fram- och bakväggar,
- eventuell mellanvägg,
- kollin,
- ghost-preview,
- spännband,
- lastnät,
- chassi och hjul.

`TransportScreen` använder en separat hjälpfunktion `strapsToYs(n)` för att konvertera strap-count till visuella y-positioner. Det är ren rendering, inte fysisk simulering.

## Använda UI-Komponenter I De Viktigaste Flödena

Det som faktiskt används i source i dag är främst:

- [src/components/ui/Button.tsx](src/components/ui/Button.tsx#L32)
- [src/components/ui/GlassCard.tsx](src/components/ui/GlassCard.tsx#L12)
- [src/components/ui/ScrollHint.tsx](src/components/ui/ScrollHint.tsx#L20)

`ProgressBar` finns i [src/components/ui/ProgressBar.tsx](src/components/ui/ProgressBar.tsx#L13), men den används inte av de centrala skärmarna i nuläget.

## Risker, Buggar Och Dubblerad Logik

Det här är de tydligaste riskerna i nuvarande implementation:

1. Lastningsskärmen är lång och komplex. Den innehåller draglogik, säkring, layout, feedback och commit i samma komponent. Det är svårt att testa och svårt att förändra säkert.
2. `computeGhost` och `autoArrange` duplicerar placeringslogik ovanpå `settleRow`. Det är korrekt i dag men svårunderhållet.
3. Lastsäkringen är semantisk, inte fysisk. Net och divider är booleska bonusar, inte riktiga objekt med positioner eller kollisionsregler.
4. Riktiga band har bara count och Y-position i renderingen. De påverkar inte lasten geometriskt.
5. `LoadingScreen` rensar överlapp i en effect i efterhand i stället för att förhindra överlapp vid källan.
6. `ResultScreen` gör en state-redirect direkt i render om `lastResult` saknas. Det fungerar men är ett antipattern och risk för konstigt flöde.
7. Transportskadan är enkel och deterministisk, men resultatet förklaras bara indirekt. Det är svårt för spelaren att förstå varför en viss last skadades.
8. Cartans spawn- och safety-filterlogik i [src/utils/cargoGenerator.ts](src/utils/cargoGenerator.ts#L150) är avancerad och delvis asynkron. Vid nätverksfel faller den öppet och behåller originaldata.
9. `main.tsx` låser touchmove globalt. Om en skärm glömmer att sätta `data-scroll` blir den i praktiken svår att använda på mobil.
10. Det finns ingen dedikerad scrollindikator på LoadingScreen, trots att den skärmen är en av de mest vertikalt trånga.

## Vad Som Sannolikt Bör Struktureras Om Senare

De mest värdefulla omstruktureringarna vore:

- Flytta lastningslogiken till en egen hook eller egen state-machine.
- Samla placerings- och metricsregler i en gemensam engine i stället för att sprida dem mellan UI och utils.
- Separera visualisering av trailer från säkringslogik, så att TrailerView bara renderar.
- Normalisera alla score-trösklar i en enda scoring-konfig.
- Bryta ut transportsimuleringens händelser till egen modul om den ska utvecklas vidare.
- Lägg till ett tydligare scroll-UX-lager för mobil, särskilt på loading, admin och leaderboard.

## Förslag: Flyttbart Lastnät

Om ett lastnät ska bli ett riktigt interaktivt objekt i stället för en toggle skulle jag modellera det som ett eget securing-objekt med position och utbredning.

Praktisk riktning:

- Lägg till en `netPosition` eller `netAnchor` i `SecuringState`.
- Låt användaren dra nätet i trailer-ytan ungefär som kollin dras i loading-fasen.
- Definiera nätets coverage som en geometri över trailerens bakre del, inte som en ren boolean.
- Beräkna säkringspoängen utifrån hur stor del av lastens bakre öppning nätet faktiskt täcker.
- Rendera nätet som ett eget lager i `TrailerView`, med en dragbar handtagspunkt och tydlig snap till bakre zoner.

Det skulle göra nätet mer begripligt för användaren och öppna för mer korrekt scoring.

## Förslag: Generell Scrollindikator Med Grön Lysande Linje Eller Diod

Den nuvarande [src/components/ui/ScrollHint.tsx](src/components/ui/ScrollHint.tsx#L20) visar en liten pil. Om målet är en mer tydlig industriell LBC-känsla skulle jag ersätta eller komplettera den med en generell indikator som:

- visas längst ned i den scrollbara containern,
- aktiveras när `scrollHeight > clientHeight` och användaren inte är nära botten,
- består av en tunn grön lyslinje eller en liten diod som pulserar,
- döljs gradvis när användaren når botten,
- återanvänds på result, profile, garage, admin och loading.

En bra implementation vore att göra detta som en liten wrapper runt befintlig scrollyta, så att den använder samma `ResizeObserver`- och scrolllogik som `ScrollHint`, men byter ut pilen mot en smal LED-lik linje med glow.

## Kort Slutsats

Projektet är redan ganska välstrukturerat för ett litet React-spel: data, store, rendering och beräkningar är separerade på rätt nivå. Den största tekniska skulden sitter i lastningsskärmen, där flera beteenden är hopklumpade. Nästa rimliga steg vore därför inte att ändra scoring först, utan att bryta ut lastningslogik och säkringsmodell till tydligare, testbara delar.