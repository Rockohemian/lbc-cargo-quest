/**
 * Kunskapsstjärnor på kartan.
 *
 * Tre frågor om LBC Frakt som ger bonuspoäng i rundan. Innehållet är faktagranskat
 * mot lbcfrakt.com och godkänt av verksamheten inför mässan.
 */

export interface QuizStar {
  id: string
  /** Kort etikett på kartan och i rubriken. */
  label: string
  question: string
  /** Exakt tre alternativ. */
  options: string[]
  correctIndex: number
  /** Visas efter svaret, oavsett om det var rätt eller fel. */
  explanation: string
}

/** Poäng per korrekt besvarad stjärna. Fel svar ger 0. */
export const QUIZ_STAR_POINTS = 300

export const QUIZ_STARS: QuizStar[] = [
  {
    id: 'star-omraden',
    label: 'Var vi verkar',
    question: 'Var har LBC Frakt sin starkaste lokala förankring?',
    options: ['Värmland och Skaraborg', 'Skåne och Blekinge', 'Norrbotten och Västerbotten'],
    correctIndex: 0,
    explanation:
      'Huvudkontoret ligger på Lovartsgatan i Karlstad. Vi kör dagligen i Värmland, men också gods ' +
      'vidare ut i Sverige, Norge och övriga Norden — och med XR Logistik finns vi även i Skaraborg.',
  },
  {
    id: 'star-laddbolaget',
    label: 'Omställningen till el',
    question: 'Koncernen har ett eget bolag som bygger snabbladdning för tunga elfordon. Vad heter det?',
    options: ['Laddbolaget i Värmland', 'Vänerexpressen', 'Grusdirekt'],
    correctIndex: 0,
    explanation:
      'Laddbolaget bygger laddinfrastruktur för tung trafik. Vi kör redan eldrivet i skarp drift — ' +
      'bland annat en världsunik eldriven flisbil, och en eldriven dragbil som kör CLT till Borlänge.',
  },
  {
    id: 'star-omstallning',
    label: 'Vi ställer om branschen',
    question: 'LBC Frakt vill vara en förebild och ställa om hela transportbranschen. Vad satsar vi på?',
    options: [
      'Eldrift, fossilfria bränslen och att dela lärdomarna vidare',
      'Att avvakta tills tekniken är färdigutvecklad',
      'Färre och långsammare transporter',
    ],
    correctIndex: 0,
    explanation:
      'Vi kör redan eldrivet i skarp drift — bland annat en världsunik eldriven flisbil på 94 ton. ' +
      'Bergtäkten i Bråtebäcken går fossilfritt sedan 2026. Målet är ett fossilfritt Sverige 2045 — ' +
      'och dit kommer vi bara tillsammans med våra fyrtiotalet delägaråkerier, kunder och förare.',
  },
]

/**
 * Hur långt från spelaren stjärnorna placeras, i meter.
 * Utan GPS spelas allt från kartan, så då räcker en tätare placering.
 */
export const STAR_LAYOUT: Array<{ meters: number; tapMeters: number; bearing: number }> = [
  { meters: 55, tapMeters: 28, bearing: 25 },
  { meters: 95, tapMeters: 45, bearing: 155 },
  { meters: 130, tapMeters: 62, bearing: 275 },
]
