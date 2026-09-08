/**
 * Flakbilen sedd från sidan: Volvo FM 6x2 solobil med pallflak, i LBC-livré.
 *
 * Ritningen är uppmätt ur en skalenlig ortografisk blueprint av Volvo FM 2020
 * (skala 1:50, kalibrerad mot måtten 1360 och 2495 mm) och färgsatt efter
 * LBC:s egen lackering — grönt Pantone 348 C, silver 429 C, samplade ur
 * originalfilen. Hyttens front är i det närmaste vertikal: från stötfångaren
 * till takkanten lutar den bara 0,20-0,26 m bakåt. Det är den detaljen som
 * skiljer en Volvo i profil från en generisk lastbil.
 *
 * Koordinatsystemet är METER, inte pixlar: `X()` och `Y()` räknar om till
 * bildrutan. Därför går måtten att jämföra rakt mot ritningen, och en ändring
 * i verkligheten går att föra in utan att räkna om något.
 */

import { useId } from "react";

import { fraktionsetikett, fraktionsfarg } from "./fraktionsfarger";
import {
  PALL_H,
  PALL_KOLUMNER,
  PALL_L,
  PALL_RADER,
  PALL_TJOCKLEK,
  stada,
  type Pall,
  type Pallast,
} from "./pallast";

const S = 48;
const MARK = 212;
const X0 = 20;
const X = (m: number) => X0 + m * S;
const Y = (h: number) => MARK - h * S;
const L = (m: number) => m * S;

const BIL = {
  bak: 9.5,
  axlar: [1.45, 6.25, 7.6],
  hjulr: 0.536,
  ramO: 1.1,
  ramU: 0.88,
};

/** Flakets golvhöjd över marken och lastytans utsträckning, meter. */
const FLAK = { golv: 1.28, fram: 2.56, lastX0: 2.68 };
const FLAK_BAK = FLAK.lastX0 + PALL_KOLUMNER * PALL_L + 0.1;

const GRON = "#00843e";
const GRA = "#a4a9ac";
const TRA_LJUS = "#d8b485";
const TRA = "#bd9358";
const TRA_MORK = "#96703f";

/**
 * Lackeringens ställbara delar.
 *
 * Originalet från Biocompanion är fast lackerat. Här är kulörerna utbrutna så
 * att garagets delar kan byta dem — geometrin är densamma, det är bara färgen
 * som skiljer en uppgraderad bil från en standardbil.
 */
export interface Ekipagetema {
  /** Hyttdekor och batterikjol. */
  gron: string;
  /** Gröna lister på flaket. */
  dekor: string;
  /** Takspoilerns kantlist. */
  taklist: string;
  /** Fälgarnas grundton. */
  falg: string;
  /** Lyktglaset fram. */
  lykta: string;
}

export const LBC_TEMA: Ekipagetema = {
  gron: GRON,
  dekor: GRON,
  taklist: GRON,
  falg: "#8b939c",
  lykta: "#e9eef3",
};

/** Linjär blandning mellan två hexfärger. Används för att härleda ljus- och
 *  skuggton ur en enda vald kulör, så gradienterna håller ihop oavsett färg. */
function blanda(hex: string, mot: string, t: number): string {
  const las = (h: string) => {
    const s = h.replace("#", "");
    const v = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  };
  const a = las(hex);
  const b = las(mot);
  const ut = a.map((n, i) => Math.round(n + ((b[i] ?? n) - n) * t));
  return `#${ut.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/* Hyttsiluetten. Konturen extraherades ur blueprinten med floodfill och
   mättes kolumnvis, så proportionerna är mätta och inte uppskattade.
   Uttryckt som andel av hyttlängd (a) och hytthöjd (b): x = 0,04 + a*2,42,
   h = b*2,92. Taket nås redan vid a=0,13; fronten går från b=0,10 till 0,98.
   Framhjulet sitter INNE i hytten, med mörk skärmkant runt öppningen. */
const HYTT_PATH = `
  M ${X(0.1)} ${Y(0.3)}
  L ${X(0.05)} ${Y(0.44)}
  L ${X(0.04)} ${Y(1.15)}
  L ${X(0.08)} ${Y(2.1)}
  L ${X(0.15)} ${Y(2.56)}
  C ${X(0.2)} ${Y(2.8)} ${X(0.3)} ${Y(2.92)} ${X(0.5)} ${Y(2.92)}
  L ${X(2.32)} ${Y(2.96)}
  C ${X(2.41)} ${Y(2.96)} ${X(2.46)} ${Y(2.91)} ${X(2.46)} ${Y(2.83)}
  L ${X(2.46)} ${Y(0.9)}
  L ${X(2.06)} ${Y(0.9)}
  A ${L(0.6)} ${L(0.4)} 0 0 0 ${X(0.86)} ${Y(0.9)}
  L ${X(0.86)} ${Y(0.54)}
  L ${X(0.44)} ${Y(0.54)}
  L ${X(0.38)} ${Y(0.34)}
  L ${X(0.12)} ${Y(0.3)} Z`;

/* LBC-ordmärket som riktig vektor, konverterat ur LBCfrakt_primar_CMYK.eps.
   Bokstavsformerna lutar redan i originalet; `LUTNING` nedan är den extra
   snedställning lackeringen har på dörren. */
const LOGGA_W = 95.35;
const LOGGA_H = 46.81;
const LOGGA_D: readonly { f: string; d: string }[] = [
  {
    f: GRA,
    d: "M 11.95 39.10 L 12.17 37.82 L 17.85 4.91 L 7.35 4.90 L 2.53 44.55 L 21.21 44.57 L 22.13 39.34 L 13.25 39.13 L 11.95 39.10 L 11.95 39.10 Z",
  },
  {
    f: GRA,
    d: "M 54.53 33.55 C 53.70 32.73 52.42 31.92 50.75 30.97 L 49.57 30.30 L 50.45 29.27 C 53.45 25.79 55.86 22.80 57.51 20.10 C 59.09 17.52 59.97 15.23 59.97 13.07 C 59.97 11.07 59.04 9.35 57.40 7.67 C 55.71 5.94 53.26 4.25 50.30 2.38 L 40.13 4.50 C 42.14 5.60 43.77 6.56 45.07 7.45 L 45.14 7.45 L 45.14 7.50 C 45.83 7.97 46.43 8.43 46.95 8.88 C 49.07 10.69 49.88 12.36 49.88 14.46 C 49.87 16.30 49.09 18.37 47.60 21.02 C 46.31 23.30 44.48 26.05 42.13 29.49 C 42.91 29.92 43.89 30.54 44.67 31.33 C 45.54 32.20 46.19 33.27 46.19 34.53 C 46.19 35.53 45.83 36.54 45.23 37.59 L 45.23 37.59 C 44.69 38.55 43.97 39.52 43.16 40.57 L 43.15 40.59 L 40.12 44.35 L 50.17 44.36 L 52.10 41.93 L 52.11 41.93 C 53.36 40.37 54.27 39.24 54.84 38.26 C 55.35 37.40 55.59 36.66 55.59 35.76 C 55.59 34.93 55.22 34.23 54.53 33.55 L 54.53 33.55 Z",
  },
  {
    f: GRA,
    d: "M 38.77 30.45 L 38.89 30.27 L 42.48 9.70 L 32.76 9.69 L 28.58 44.34 L 36.44 44.35 L 38.85 30.49 L 38.77 30.45 L 38.77 30.45 Z",
  },
  {
    f: GRA,
    d: "M 77.25 37.78 C 75.12 34.95 73.72 31.92 73.72 28.97 C 73.72 25.69 74.52 22.32 75.88 18.68 C 77.16 15.26 78.92 11.63 80.95 7.63 L 71.19 7.62 C 68.69 11.89 66.73 15.68 65.39 19.14 C 64.01 22.69 63.27 25.91 63.27 28.96 L 63.28 28.96 C 63.27 31.63 63.81 33.84 65.23 36.19 C 66.66 38.56 68.98 41.10 72.53 44.37 L 83.88 44.38 C 81.42 42.45 79.07 40.18 77.25 37.78 L 77.25 37.78 Z",
  },
  {
    f: GRA,
    d: "M 84.17 3.79 L 83.69 6.43 L 83.72 6.43 L 83.47 7.76 L 80.62 22.90 L 89.27 22.91 L 92.67 3.80 L 84.17 3.79 L 84.17 3.79 Z",
  },
  {
    f: GRON,
    d: "M 14.60 36.92 L 20.29 3.98 L 20.51 2.66 L 5.37 2.65 L 5.25 3.64 L 0.15 45.54 L 0.00 46.80 L 23.09 46.81 L 23.26 45.88 L 24.57 38.44 L 24.79 37.16 L 23.48 37.13 L 14.60 36.92 L 14.60 36.92 Z M 21.21 44.57 L 2.53 44.55 L 7.35 4.90 L 17.85 4.91 L 12.17 37.82 L 11.95 39.10 L 13.25 39.13 L 22.13 39.34 L 21.21 44.57 L 21.21 44.57 Z",
  },
  {
    f: GRON,
    d: "M 62.22 13.07 C 62.22 10.42 61.05 8.20 59.00 6.11 C 57.08 4.14 54.37 2.29 51.10 0.24 L 50.72 0.00 L 50.28 0.09 L 36.66 2.93 L 33.61 3.57 L 36.36 5.02 C 38.07 5.92 39.54 6.72 40.82 7.45 L 30.77 7.44 L 30.65 8.43 L 26.20 45.33 L 26.05 46.58 L 51.25 46.60 L 51.59 46.18 L 53.86 43.33 L 53.85 43.33 C 55.17 41.69 56.12 40.50 56.77 39.39 C 57.49 38.17 57.83 37.09 57.83 35.77 C 57.83 34.27 57.24 33.08 56.10 31.95 C 55.33 31.19 54.30 30.47 53.02 29.71 C 55.69 26.57 57.86 23.81 59.42 21.27 C 61.22 18.34 62.21 15.68 62.22 13.07 L 62.22 13.07 Z M 54.84 38.26 C 54.27 39.24 53.36 40.37 52.11 41.93 L 52.10 41.93 L 50.17 44.36 L 40.12 44.35 L 43.15 40.59 L 43.16 40.57 C 43.97 39.52 44.69 38.55 45.23 37.59 L 45.23 37.59 C 45.83 36.54 46.19 35.53 46.19 34.53 C 46.19 33.27 45.54 32.20 44.67 31.33 C 43.89 30.54 42.91 29.92 42.13 29.49 C 44.48 26.05 46.31 23.30 47.60 21.02 C 49.09 18.37 49.87 16.30 49.88 14.46 C 49.88 12.36 49.07 10.69 46.95 8.88 C 46.43 8.43 45.83 7.97 45.14 7.50 L 45.14 7.45 L 45.07 7.45 C 43.77 6.56 42.14 5.60 40.13 4.50 L 50.30 2.38 C 53.26 4.25 55.71 5.94 57.40 7.67 C 59.04 9.35 59.97 11.07 59.97 13.07 C 59.97 15.23 59.09 17.52 57.51 20.10 C 55.86 22.80 53.45 25.79 50.45 29.27 L 49.57 30.30 L 50.75 30.97 C 52.42 31.92 53.70 32.73 54.53 33.55 C 55.22 34.23 55.59 34.93 55.59 35.76 C 55.59 36.66 55.35 37.40 54.84 38.26 L 54.84 38.26 Z M 28.58 44.34 L 32.76 9.69 L 42.48 9.70 L 38.89 30.27 L 38.77 30.45 L 38.85 30.49 L 36.44 44.35 L 28.58 44.34 L 28.58 44.34 Z M 41.95 25.76 L 44.71 9.95 C 44.99 10.16 45.26 10.37 45.50 10.58 C 47.04 11.90 47.63 13.06 47.63 14.46 C 47.63 15.88 46.95 17.61 45.65 19.92 C 44.72 21.58 43.48 23.49 41.95 25.76 L 41.95 25.76 Z M 40.97 31.41 C 41.60 31.75 42.43 32.26 43.08 32.91 C 43.58 33.41 43.95 33.97 43.95 34.53 C 43.95 35.11 43.70 35.76 43.29 36.48 L 43.29 36.49 C 42.83 37.30 42.16 38.20 41.40 39.19 L 41.40 39.19 L 39.12 42.03 L 40.97 31.41 L 40.97 31.41 Z",
  },
  {
    f: GRON,
    d: "M 80.62 22.90 L 83.47 7.76 L 83.72 6.43 L 83.69 6.43 L 84.17 3.79 L 92.67 3.80 L 89.27 22.91 L 80.62 22.90 L 80.62 22.90 Z M 95.35 1.56 L 95.35 1.55 L 94.01 1.55 L 82.31 1.54 L 82.14 2.47 L 81.61 5.39 L 69.92 5.38 L 69.59 5.93 C 66.88 10.51 64.76 14.58 63.30 18.33 C 61.82 22.13 61.04 25.61 61.04 28.96 L 61.03 28.96 C 61.03 32.05 61.65 34.61 63.30 37.34 C 64.89 39.98 67.44 42.75 71.34 46.32 L 71.67 46.62 L 91.05 46.63 L 87.97 44.57 C 84.71 42.40 81.38 39.52 79.04 36.43 C 77.18 33.97 75.96 31.39 75.97 28.97 C 75.97 25.97 76.71 22.85 77.98 19.46 C 78.50 18.06 79.12 16.60 79.81 15.08 L 78.17 23.82 L 77.92 25.15 L 91.15 25.16 L 91.32 24.23 L 95.12 2.87 L 95.35 1.56 L 95.35 1.56 Z M 72.53 44.37 C 68.98 41.10 66.66 38.56 65.23 36.19 C 63.81 33.84 63.27 31.63 63.28 28.96 L 63.27 28.96 C 63.27 25.91 64.01 22.69 65.39 19.14 C 66.73 15.68 68.69 11.89 71.19 7.62 L 80.95 7.63 C 78.92 11.63 77.16 15.26 75.88 18.68 C 74.52 22.32 73.72 25.69 73.72 28.97 C 73.72 31.92 75.12 34.95 77.25 37.78 C 79.07 40.18 81.42 42.45 83.88 44.38 L 72.53 44.37 L 72.53 44.37 Z",
  },
];

function Hjul({ cx, r, id, falg }: { cx: number; r: number; id: string; falg: string }) {
  const x = X(cx);
  const y = Y(r);
  const R = L(r);
  const mork = blanda(falg, "#000000", 0.32);
  const bult = blanda(falg, "#000000", 0.12);
  return (
    <g>
      <circle cx={x} cy={y} r={R} fill="#101015" />
      <circle cx={x} cy={y} r={R} fill="none" stroke="#26262f" strokeWidth={2.5} />
      <circle
        cx={x}
        cy={y}
        r={R * 0.56}
        fill={`url(#${id}Falg)`}
        stroke={mork}
        strokeWidth={1}
      />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <circle
            key={i}
            cx={x + Math.cos(a) * R * 0.33}
            cy={y + Math.sin(a) * R * 0.33}
            r={1.5}
            fill={bult}
          />
        );
      })}
      <circle cx={x} cy={y} r={R * 0.17} fill={falg} />
    </g>
  );
}

function Stankskarm({ cx, r }: { cx: number; r: number }) {
  const x = X(cx);
  const R = L(r);
  const y = Y(r);
  return (
    <path
      d={`M ${x - R * 1.12} ${y} A ${R * 1.12} ${R * 1.12} 0 0 1 ${x + R * 1.12} ${y}
          L ${x + R * 1.12} ${y - 3} A ${R * 1.2} ${R * 1.2} 0 0 0 ${x - R * 1.12} ${y - 3} Z`}
      fill="#1a1a22"
    />
  );
}

/** Silverblixten på batterikjolen. `hm` är kjolens underkant, inte mitten. */
function Blixt({ xm, hm, hojd, bredd }: { xm: number; hm: number; hojd: number; bredd: number }) {
  const s = hojd / 0.5;
  const b = s * bredd;
  const p = (dx: number, dh: number) => `${X(xm + dx * b)} ${Y(hm + dh * s)}`;
  return (
    <path
      d={`M ${p(0, 0.5)} L ${p(0.26, 0.5)} L ${p(0.13, 0.27)} L ${p(0.34, 0.27)}
          L ${p(0.06, 0)} L ${p(0.2, 0.22)} L ${p(-0.02, 0.22)} Z`}
      fill="#eef1f3"
      opacity={0.92}
    />
  );
}

/** LBC-ordmärket. `halo` ritar en vit kantlinje under, så märket håller ihop
 *  mot dekoren i stället för att lösas upp i den. */
function Logga({ cx, ch, hojd, lutning }: { cx: number; ch: number; hojd: number; lutning: number }) {
  const s = L(hojd) / LOGGA_H;
  const bredd = LOGGA_W * s;
  const h = LOGGA_H * s;
  const mx = X(cx);
  const my = Y(ch);
  const rot = lutning ? `rotate(${lutning} ${mx.toFixed(2)} ${my.toFixed(2)}) ` : "";
  return (
    <g
      transform={`${rot}translate(${(mx - bredd / 2).toFixed(2)},${(my - h / 2).toFixed(2)}) scale(${s.toFixed(5)})`}
    >
      {LOGGA_D.map((o, i) => (
        <path
          key={`h${i}`}
          fill="#ffffff"
          stroke="#ffffff"
          strokeWidth={5}
          strokeLinejoin="round"
          d={o.d}
        />
      ))}
      {LOGGA_D.map((o, i) => (
        <path key={i} fill={o.f} d={o.d} />
      ))}
    </g>
  );
}

/**
 * En lastad EUR-pall på flaket.
 *
 * Positionen sätts med `transform` och inte med `x`/`y` på rektangeln, för att
 * CSS ska kunna animera den. Kombinerat med pallens `id` som React-nyckel blir
 * en omlastning en RÖRELSE i vyn: samma DOM-nod flyttar sig, i stället för att
 * försvinna på ett ställe och dyka upp på ett annat. Det är skillnaden mellan
 * att se att pallen flyttades och att gissa det.
 */
function Pallplats({ pall, dampad }: { pall: Pall; dampad: boolean }) {
  const w = L(PALL_L);
  const h = L(PALL_H);
  const pt = L(PALL_TJOCKLEK);
  const marg = L(0.05);
  const gh = h - pt - L(0.02);
  const gw = w - marg * 2;

  const farg = fraktionsfarg(pall.gods);
  const namn = fraktionsetikett(pall.gods);
  const lastad = pall.lastad;

  const x = X(FLAK.lastX0 + pall.kolumn * PALL_L);
  const y = Y(FLAK.golv + (pall.rad + 1) * PALL_H);

  // `transform` som SVG-ATTRIBUT och inte som CSS i `style`. Båda animeras av
  // webbläsaren, men bara attributet gäller i renderare utanför browsern — och
  // SVG:t ska gå att lyfta ut till en rapport utan att pallarna ramlar ner i
  // origo.
  return (
    <g
      transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}
      style={dampad ? undefined : { transition: "transform 420ms cubic-bezier(.4,0,.2,1)" }}
    >
      {/* Godset. Tomretur ritas som en streckad kontur: pallen är ombord, men
          den bär ingenting, och det ska synas utan att läsas. */}
      {lastad ? (
        <>
          <rect x={marg} y={0} width={gw} height={gh} rx={2} fill={farg} />
          <rect x={marg} y={0} width={gw} height={gh * 0.26} rx={2} fill="#ffffff" opacity={0.14} />
          <rect
            x={marg + 1.5}
            y={1.5}
            width={gw - 3}
            height={gh - 3}
            rx={1.5}
            fill="none"
            stroke="#00000030"
            strokeWidth={1}
          />
          {/* Emballagebanden. Två stycken, som på en riktig sträckfilmad pall. */}
          {[0.32, 0.68].map((f) => (
            <line
              key={f}
              x1={marg + gw * f}
              y1={2}
              x2={marg + gw * f}
              y2={gh - 2}
              stroke="#00000026"
              strokeWidth={1.4}
            />
          ))}
        </>
      ) : (
        <rect
          x={marg}
          y={gh * 0.42}
          width={gw}
          height={gh * 0.58}
          rx={2}
          fill={farg}
          opacity={0.12}
          stroke={farg}
          strokeWidth={1.4}
          strokeDasharray="6 4"
        />
      )}

      {/* Etiketten pressas ihop om namnet är för långt för pallen. Ett namn
          som svämmar ut över grannpallen är värre än ett som står trångt —
          då går det inte att se vilket gods som står var. */}
      <text
        x={w / 2}
        y={lastad ? gh / 2 + 6 : gh * 0.78}
        textAnchor="middle"
        fontSize={15}
        fontWeight={700}
        fill={lastad ? "#12120f" : farg}
        textLength={namn.length * 8.7 > gw - 8 ? gw - 8 : undefined}
        lengthAdjust="spacingAndGlyphs"
      >
        {namn}
      </text>

      {/* Träpallen: överdäck, tre klossar, bottendäck. */}
      <rect x={0} y={gh + L(0.02)} width={w} height={pt * 0.3} rx={1} fill={TRA_LJUS} />
      {[0, 0.43, 0.86].map((f) => (
        <rect
          key={f}
          x={w * f + (f === 0 ? 1 : 0)}
          y={gh + L(0.02) + pt * 0.3}
          width={w * 0.14}
          height={pt * 0.42}
          fill={TRA_MORK}
        />
      ))}
      <rect x={0} y={gh + L(0.02) + pt * 0.72} width={w} height={pt * 0.26} rx={1} fill={TRA} />
    </g>
  );
}

export interface EkipagegrafikProps {
  /** Pallarna på flaket. Tom lista = tomt flak. */
  last: Pallast;
  /** Stäng av glidningen. Sätts när lastbilden byts utan att en rörelse skett —
   *  då är det inte en förflyttning som ska visas, och en animering hade bara
   *  fördröjt bilden. Följer också `prefers-reduced-motion` via anroparen. */
  dampad?: boolean;
  /** Lackering. Utelämnad ger LBC:s standardlivré. */
  tema?: Partial<Ekipagetema>;
  className?: string;
}

export function Ekipagegrafik({ last, dampad = false, tema, className }: EkipagegrafikProps) {
  const id = useId().replace(/:/g, "");
  const t: Ekipagetema = { ...LBC_TEMA, ...tema };
  const gronL = blanda(t.gron, "#ffffff", 0.28);
  const gronM = blanda(t.gron, "#000000", 0.28);
  const falgL = blanda(t.falg, "#ffffff", 0.45);
  const falgM = blanda(t.falg, "#000000", 0.32);
  const pallar = stada(last);
  const upptagen = new Set(pallar.map((p) => `${p.kolumn}:${p.rad}`));
  return (
    <svg
      viewBox="6 40 512 186"
      className={className}
      role="img"
      aria-label="Lastbilens pallast"
      fontFamily="Manrope, Segoe UI, system-ui, sans-serif"
    >
      <defs>
        <linearGradient id={`${id}Vit`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f0f1f3" />
          <stop offset="82%" stopColor="#dcdee2" />
          <stop offset="100%" stopColor="#c6c9ce" />
        </linearGradient>
        <linearGradient id={`${id}Gron`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={gronL} />
          <stop offset="45%" stopColor={t.gron} />
          <stop offset="100%" stopColor={gronM} />
        </linearGradient>
        <linearGradient id={`${id}Glas`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#4a5560" />
          <stop offset="55%" stopColor="#232c35" />
          <stop offset="100%" stopColor="#161d24" />
        </linearGradient>
        <linearGradient id={`${id}Falg`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={falgL} />
          <stop offset="52%" stopColor={t.falg} />
          <stop offset="100%" stopColor={falgM} />
        </linearGradient>
        <linearGradient id={`${id}Ram`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a5058" />
          <stop offset="100%" stopColor="#2a2e34" />
        </linearGradient>
        <radialGradient id={`${id}Skugga`} cx="0.5" cy="0.5">
          <stop offset="0%" stopColor="#000" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#000" stopOpacity={0} />
        </radialGradient>
        <clipPath id={`${id}Hytt`}>
          <path d={HYTT_PATH} />
        </clipPath>
      </defs>

      <ellipse cx={X(5)} cy={MARK + 5} rx={L(5.4)} ry={8} fill={`url(#${id}Skugga)`} />
      <line x1={X(-0.3)} y1={MARK} x2={X(10.2)} y2={MARK} stroke="#33333f" strokeWidth={1.5} />

      {/* Bilens ram och påbyggnad */}
      <rect
        x={X(2.46)}
        y={Y(BIL.ramO)}
        width={L(BIL.bak - 2.46)}
        height={L(BIL.ramO - BIL.ramU)}
        fill={`url(#${id}Ram)`}
      />
      <rect x={X(2.6)} y={Y(0.86)} width={L(1.15)} height={L(0.52)} rx={4} fill="#8f979f" />
      <rect
        x={X(4.0)}
        y={Y(0.82)}
        width={L(1.3)}
        height={L(0.44)}
        rx={3}
        fill="#3c424a"
        stroke="#565d66"
        strokeWidth={0.8}
      />
      {/* Grön batterikjol med silverblixt */}
      <rect x={X(2.55)} y={Y(0.82)} width={L(3.3)} height={L(0.48)} rx={3} fill={`url(#${id}Gron)`} />
      <Blixt xm={3.0} hm={0.365} hojd={0.435} bredd={0.82} />

      {/* Flakets golvbädd med grön kantlist. Pallarna vilar på överkanten. */}
      <rect
        x={X(FLAK.fram)}
        y={Y(FLAK.golv)}
        width={L(FLAK_BAK - FLAK.fram)}
        height={L(FLAK.golv - BIL.ramO)}
        fill="#59616a"
      />
      <rect
        x={X(FLAK.fram)}
        y={Y(FLAK.golv)}
        width={L(FLAK_BAK - FLAK.fram)}
        height={3}
        fill={t.dekor}
        opacity={0.85}
      />

      {/* Framstam mot hytten och bakläm. Låga nog att lasten syns hela vägen —
          det är lasten som är poängen med vyn, inte lämmarna. */}
      <rect
        x={X(FLAK.fram)}
        y={Y(FLAK.golv + 0.62)}
        width={L(0.1)}
        height={L(0.62)}
        rx={1}
        fill={`url(#${id}Vit)`}
        stroke="#9aa0a8"
        strokeWidth={0.8}
      />
      <rect
        x={X(FLAK_BAK - 0.1)}
        y={Y(FLAK.golv + 0.62)}
        width={L(0.1)}
        height={L(0.62)}
        rx={1}
        fill={`url(#${id}Vit)`}
        stroke="#9aa0a8"
        strokeWidth={0.8}
      />

      {BIL.axlar.map((a) => (
        <Stankskarm key={`bs${a}`} cx={a} r={BIL.hjulr} />
      ))}

      {/* Takspoiler: vit med grön kantlist */}
      <path
        d={`M ${X(0.58)} ${Y(2.9)} C ${X(1.2)} ${Y(3.14)} ${X(1.9)} ${Y(3.26)} ${X(2.34)} ${Y(3.3)}
            L ${X(2.42)} ${Y(2.88)} Z`}
        fill={`url(#${id}Vit)`}
        stroke="#b8bec4"
        strokeWidth={0.8}
      />
      <path
        d={`M ${X(0.58)} ${Y(2.9)} C ${X(1.2)} ${Y(3.14)} ${X(1.9)} ${Y(3.26)} ${X(2.34)} ${Y(3.3)}`}
        fill="none"
        stroke={t.taklist}
        strokeWidth={2}
      />
      <rect x={X(2.06)} y={Y(0.9)} width={L(0.4)} height={L(0.48)} fill="#2b3138" />

      {/* Hytten: vit grund, klippt dekor */}
      <path
        d={HYTT_PATH}
        fill={`url(#${id}Vit)`}
        stroke="#9aa0a8"
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <g clipPath={`url(#${id}Hytt)`}>
        <path
          d={`M ${X(0.03)} ${Y(0.28)} L ${X(0.03)} ${Y(0.92)} L ${X(0.34)} ${Y(0.86)}
              C ${X(0.46)} ${Y(0.8)} ${X(0.5)} ${Y(0.68)} ${X(0.5)} ${Y(0.6)}
              L ${X(0.48)} ${Y(0.28)} Z`}
          fill={`url(#${id}Gron)`}
        />
        <path
          d={`M ${X(2.18)} ${Y(0.9)} A ${L(0.72)} ${L(0.52)} 0 0 0 ${X(0.74)} ${Y(0.9)}
              L ${X(0.86)} ${Y(0.9)} A ${L(0.6)} ${L(0.4)} 0 0 1 ${X(2.06)} ${Y(0.9)} Z`}
          fill={`url(#${id}Gron)`}
        />
        {/* Bakre fältet. Blixten är inte ett eget märke utan själva GRÄNSEN
            mellan silverbandet och det gröna — samma motiv som på kjolen. */}
        <path
          d={`M ${X(2.24)} ${Y(2.98)} L ${X(1.96)} ${Y(1.98)} L ${X(2.14)} ${Y(1.74)}
              L ${X(1.94)} ${Y(0.88)} L ${X(2.04)} ${Y(0.88)} L ${X(2.26)} ${Y(1.74)}
              L ${X(2.08)} ${Y(1.98)} L ${X(2.36)} ${Y(2.98)} Z`}
          fill={GRA}
        />
        <path
          d={`M ${X(2.36)} ${Y(2.98)} L ${X(2.08)} ${Y(1.98)} L ${X(2.26)} ${Y(1.74)}
              L ${X(2.04)} ${Y(0.88)} L ${X(2.52)} ${Y(0.86)} L ${X(2.52)} ${Y(2.98)} Z`}
          fill={`url(#${id}Gron)`}
        />
        <path
          d={`M ${X(0.03)} ${Y(0.44)} L ${X(0.4)} ${Y(0.4)} L ${X(0.4)} ${Y(0.3)}
              L ${X(0.03)} ${Y(0.28)} Z`}
          fill="#31373e"
        />
      </g>

      <path
        d={`M ${X(0.86)} ${Y(0.9)} A ${L(0.6)} ${L(0.4)} 0 0 1 ${X(2.06)} ${Y(0.9)}`}
        fill="none"
        stroke="#23282e"
        strokeWidth={3}
      />

      {/* Instegsnisch med två steg */}
      <rect x={X(0.48)} y={Y(0.98)} width={L(0.34)} height={L(0.42)} rx={2} fill="#171b20" />
      <rect x={X(0.51)} y={Y(0.76)} width={L(0.28)} height={L(0.05)} rx={1} fill="#aeb6bd" />
      <rect x={X(0.53)} y={Y(0.44)} width={L(0.26)} height={L(0.06)} rx={1} fill="#3a4149" />
      <rect x={X(0.54)} y={Y(0.42)} width={L(0.24)} height={L(0.035)} rx={1} fill="#aeb6bd" />

      {/* Glasen. A-stolpen är brant på FM, så vindrutan syns i profil som ett
          smalt svept fält vid hörnet. */}
      <path
        d={`M ${X(0.07)} ${Y(1.78)} L ${X(0.13)} ${Y(2.5)} L ${X(0.44)} ${Y(2.55)}
            L ${X(0.3)} ${Y(1.86)} Z`}
        fill={`url(#${id}Glas)`}
        stroke="#1b2026"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <path
        d={`M ${X(0.54)} ${Y(1.82)} L ${X(0.66)} ${Y(2.5)} L ${X(1.42)} ${Y(2.56)}
            L ${X(1.42)} ${Y(1.96)} L ${X(0.7)} ${Y(1.87)} Z`}
        fill={`url(#${id}Glas)`}
        stroke="#1b2026"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <path
        d={`M ${X(0.62)} ${Y(2.12)} L ${X(0.66)} ${Y(2.44)} L ${X(0.94)} ${Y(2.47)}
            L ${X(0.86)} ${Y(2.09)} Z`}
        fill="#ffffff"
        opacity={0.13}
      />

      <path
        d={`M ${X(0.5)} ${Y(1.04)} L ${X(0.5)} ${Y(1.78)}`}
        stroke="#c2c8ce"
        strokeWidth={0.9}
        fill="none"
      />
      <path
        d={`M ${X(1.5)} ${Y(1.0)} L ${X(1.49)} ${Y(2.52)}`}
        stroke="#b6bdc4"
        strokeWidth={1}
        fill="none"
      />
      <rect x={X(0.03)} y={Y(2.8)} width={L(0.62)} height={L(0.25)} rx={3} fill="#161b21" />

      <Logga cx={1.02} ch={1.55} hojd={0.62} lutning={-7} />

      <rect x={X(1.24)} y={Y(1.56)} width={L(0.17)} height={L(0.055)} rx={2} fill="#5b636b" />

      {/* Front i profil: lyktglas runt hörnet, liten blinkers */}
      <path
        d={`M ${X(0.04)} ${Y(1.34)} L ${X(0.14)} ${Y(1.37)} L ${X(0.13)} ${Y(1.6)}
            L ${X(0.045)} ${Y(1.57)} Z`}
        fill={t.lykta}
        stroke="#aab2b9"
        strokeWidth={0.6}
      />
      <circle cx={X(0.085)} cy={Y(1.26)} r={1.4} fill="#e8a13a" />

      {/* Speglar: hyttens främsta punkt i profil */}
      <path
        d={`M ${X(0.12)} ${Y(2.62)} L ${X(-0.06)} ${Y(2.68)}`}
        stroke="#2a3036"
        strokeWidth={2.4}
      />
      <rect
        x={X(-0.15)}
        y={Y(2.62)}
        width={L(0.12)}
        height={L(0.62)}
        rx={3}
        fill="#232a31"
        stroke="#12161a"
        strokeWidth={0.8}
      />
      <rect x={X(-0.12)} y={Y(1.92)} width={L(0.09)} height={L(0.14)} rx={2} fill="#232a31" />

      {BIL.axlar.map((a) => (
        <Hjul key={`bh${a}`} cx={a} r={BIL.hjulr} id={id} falg={t.falg} />
      ))}

      {/* Lediga pallplatser ritas som en streckad kontur, inte som ingenting.
          Flaket har alltid tio platser; att de står tomma är en uppgift. */}
      {Array.from({ length: PALL_KOLUMNER }, (_, k) =>
        Array.from({ length: PALL_RADER }, (_, r) =>
          upptagen.has(`${k}:${r}`) ? null : (
            <rect
              key={`tom${k}-${r}`}
              x={X(FLAK.lastX0 + k * PALL_L) + 2}
              y={Y(FLAK.golv + (r + 1) * PALL_H) + 2}
              width={L(PALL_L) - 4}
              height={L(PALL_H) - 4}
              rx={2}
              fill="none"
              stroke="#6b727b"
              strokeWidth={1}
              strokeDasharray="4 5"
              opacity={0.4}
            />
          ),
        ),
      )}

      {pallar.map((p) => (
        <Pallplats key={p.id} pall={p} dampad={dampad} />
      ))}
    </svg>
  );
}
