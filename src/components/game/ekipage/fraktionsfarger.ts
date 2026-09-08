/**
 * Färg per fraktion.
 *
 * Skild från `plan/farger.ts` med flit: den paletten kodar FORDON (position i
 * en lista), den här kodar VAD SOM ÄR I FLAKET. Samma hexvärde i båda hade
 * betytt att en grön rutt och ett grönt flak såg ut att höra ihop.
 *
 * Uppslaget går på namnet och inte på ett index, så att brännbart har samma
 * färg i dag som i går även när dagens turer innehåller helt andra fraktioner.
 * Kända fraktioner har en tänkt färg; okända får en stabil färg ur hashen i
 * stället för en reservfärg, eftersom två okända fraktioner intill varandra
 * annars blir omöjliga att skilja åt.
 */

const KANDA: Record<string, string> = {
  BRANNBART: "#e8703a",
  TRA: "#c9a227",
  TRADGARD: "#7aa63f",
  WELL: "#3a8fd9",
  WELLPAPP: "#3a8fd9",
  PAPPER: "#4a7fc0",
  METALL: "#8a93a0",
  GIPS: "#b8a99a",
  ISOLERING: "#d18fb0",
  DEPONI: "#6b6f76",
  ELEKTRONIK: "#5b8f8a",
  FARLIGT: "#c0392b",
  SLAM: "#8a6f4a",
  GLAS: "#4aa6a0",
  PLAST: "#9a6fc0",
};

/** Reservpalett för fraktioner utan tänkt färg. Valda för att gå att skilja åt
 *  bredvid varandra och mot LBC-gröna, som ekipaget självt bär. */
const RESERV = [
  "#d1743a",
  "#3f7fc4",
  "#a8873c",
  "#7b6bb5",
  "#4f9a8e",
  "#b5586f",
] as const;

function normalisera(fraktion: string): string {
  return fraktion
    .trim()
    .toUpperCase()
    .replace(/[ÅÄ]/g, "A")
    .replace(/Ö/g, "O")
    .replace(/[^A-Z0-9]/g, "");
}

/** Stabil färg för en fraktion. Samma namn ger alltid samma färg. */
export function fraktionsfarg(fraktion: string | null | undefined): string {
  if (!fraktion) return "#8a93a0";
  const nyckel = normalisera(fraktion);
  const kand = KANDA[nyckel];
  if (kand) return kand;
  let h = 0;
  for (let i = 0; i < nyckel.length; i += 1) {
    h = (h * 31 + nyckel.charCodeAt(i)) >>> 0;
  }
  return RESERV[h % RESERV.length] ?? "#8a93a0";
}

/** Fraktionsnamnet som det ska stå på flaket — kort nog att få plats. */
export function fraktionsetikett(fraktion: string | null | undefined): string {
  if (!fraktion) return "";
  const t = fraktion.trim();
  return t.length <= 11 ? t : `${t.slice(0, 10)}.`;
}
