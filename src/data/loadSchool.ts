import type { LoadMetrics } from '../types'
import type { WeightProfile } from '../utils/loadEngine'
import { IDEAL_COM_COL, TRAILER_COLS } from '../utils/loadEngine'

/**
 * Lastskolan.
 *
 * Spelet körs på mässa och målgruppen är unga besökare. Texterna ska vara
 * sakligt korrekta men skrivna på vanlig svenska — inga paragrafer eller
 * standardnummer. Innehållet bygger på branschens lastsäkringsregler.
 */

// ─── Så funkar spelet ──────────────────────────────────────────────────────

export interface HowToStep {
  n: string
  icon: string
  title: string
  text: string
}

export const HOW_TO_PLAY: HowToStep[] = [
  {
    n: '01',
    icon: '📍',
    title: 'Hitta godset',
    text:
      'Gods ligger utspritt på kartan runt dig. Gå fram till det med GPS, eller tryck på det ' +
      'direkt om du valt kartläget. Du behöver minst 10 kolli innan du får lasta.',
  },
  {
    n: '02',
    icon: '⭐',
    title: 'Svara på kunskapsstjärnorna',
    text:
      'Tre stjärnor ligger också på kartan. Varje rätt svar om lastsäkring ger bonuspoäng ' +
      'som läggs på slutresultatet.',
  },
  {
    n: '03',
    icon: '📦',
    title: 'Bygg lasten',
    text:
      'Dra in godset i trailern. Tungt underst, lätt överst, tight mot framstammen och utan ' +
      'glapp. Mätarna visar fyllnad, balans, tyngdpunkt och hur väl du följer lastreglerna.',
  },
  {
    n: '04',
    icon: '🔗',
    title: 'Säkra lasten',
    text:
      'Svep över lasten för att lägga spännband. Lägg till lastnät och mellanvägg vid behov. ' +
      'Osäkrad last förskjuts och skadas under färden.',
  },
  {
    n: '05',
    icon: '🚚',
    title: 'Kör hem poängen',
    text:
      'Transporten simuleras utifrån hur du lastat. Du får betyg på fyllnadsgrad, balans, ' +
      'säkring, regelefterlevnad och hur mycket gods som klarade sig helt.',
  },
]

// ─── Grundreglerna ────────────────────────────────────────────────────────

export interface Lesson {
  id: string
  icon: string
  title: string
  text: string
}

export const LOAD_SCHOOL: Lesson[] = [
  {
    id: 'forces',
    icon: '⚖️',
    title: 'Krafterna lasten måste klara',
    text:
      'Vid en kraftig inbromsning pressar lasten framåt med upp till 80 % av sin egen vikt. ' +
      'Bakåt och i sidled gäller 50 %. Ett kolli på 500 kg drar alltså med 400 kg framåt — ' +
      'det är den kraften lastsäkringen ska hålla emot.',
  },
  {
    id: 'pyramid',
    icon: '📦',
    title: 'Tungt underst, lätt överst',
    text:
      'Bygg lasten som en pyramid: tung och bred bas mot golvet, lättare gods uppåt. ' +
      'Tungt högt upp lyfter tyngdpunkten och gör ekipaget tippbenäget i kurvor och rondeller.',
  },
  {
    id: 'formbundet',
    icon: '🧱',
    title: 'Lasta formbundet',
    text:
      'Lasta framifrån, dikt an mot framstammen och tight kolli mot kolli. Last som ligger an ' +
      'mot något kan inte få fart. Tomrum som blir över fylls ut med tompallar eller låses med mellanvägg.',
  },
  {
    id: 'markning',
    icon: '🏷️',
    title: 'Läs godsmärkningen',
    text:
      'Symbolerna på kartongen betyder något. Ett paraply eller ett glas betyder ömtåligt, ' +
      'en överkryssad låda betyder att inget får stå ovanpå. Sådant gods ska ligga överst ' +
      'eller för sig självt — emballaget är inte byggt för att bära last ovanifrån.',
  },
  {
    id: 'axlar',
    icon: '🛞',
    title: 'Tänk på axeltrycken',
    text:
      'Vikten ska fördelas över hela flaket. Lastar du allt för långt bak avlastas framaxeln, ' +
      'vilket försämrar både styrförmåga och bromsverkan. För långt fram överbelastas framaxeln i stället.',
  },
  {
    id: 'surrning',
    icon: '🔗',
    title: 'Surra rätt',
    text:
      'Ett band som spänns över lasten pressar ner den mot flaket och låser den med friktion. ' +
      'Använd minst två band per kolli så att det inte kan vrida sig — ett enda band blir en snurrpunkt.',
  },
  {
    id: 'friktion',
    icon: '🟧',
    title: 'Friktion är gratis lastsäkring',
    text:
      'En träpall mot ett trägolv glider lätt. Lägger du en antiglidmatta emellan blir ' +
      'motståndet ungefär tre gånger så stort — och då behövs färre band. Billigaste ' +
      'lastsäkringen som finns.',
  },
  {
    id: 'ansvar',
    icon: '👤',
    title: 'Ansvaret är ditt',
    text:
      'Det är föraren som ansvarar för att lasten är säkrad innan avfärd, och som kollar den ' +
      'under resan. Är den inte det kan bilen stoppas på plats — och i värsta fall skadas någon.',
  },
]

// ─── Coachning utifrån den faktiska lasten ────────────────────────────────

export type CoachTone = 'bad' | 'warn' | 'good'

export interface CoachTip {
  id: string
  tone: CoachTone
  title: string
  /** Konkret vad spelaren ska göra åt det. */
  fix: string
}

/**
 * Råd som bygger på mätvärdena i stället för på regelbrott.
 *
 * Regelbrotten (`metrics.violations`) säger vad som är direkt fel. Den här
 * funktionen fångar det som är lagligt men dåligt — snedfördelad vikt, hög
 * tyngdpunkt, för få band, halvtom trailer — och säger vad spelaren gör åt det.
 */
export function buildCoachTips(m: LoadMetrics, profile: WeightProfile): CoachTip[] {
  const tips: CoachTip[] = []

  // Viktfördelning i längsled. comCol 0 = framstam, TRAILER_COLS = bakdörrar.
  const drift = profile.comCol - IDEAL_COM_COL
  if (m.weightBalance < 70) {
    if (drift > 0) {
      tips.push({
        id: 'rear-heavy',
        tone: m.weightBalance < 45 ? 'bad' : 'warn',
        title: `Tyngdpunkten ligger för långt bak · ${profile.rearAxlePct} % på boggin`,
        fix:
          'Flytta de tyngsta kollina framåt mot framstammen. Bakvikt avlastar framaxeln, ' +
          'vilket ger sämre styrförmåga och sämre bromsverkan.',
      })
    } else {
      tips.push({
        id: 'front-heavy',
        tone: m.weightBalance < 45 ? 'bad' : 'warn',
        title: `Tyngdpunkten ligger för långt fram · ${profile.frontAxlePct} % på framaxeln`,
        fix:
          'Flytta tungt gods bakåt så vikten fördelas över hela flaket. För mycket vikt fram ' +
          'överbelastar framaxeln.',
      })
    }
  }

  // Sidled finns inte i rutnätet, men höjden gör det.
  if (m.cogHeight > 60) {
    tips.push({
      id: 'cog-high',
      tone: m.cogHeight > 75 ? 'bad' : 'warn',
      title: 'Tyngdpunkten sitter högt',
      fix:
        'Dra ner de tunga kollina till golvet och lägg bara lätt gods överst. ' +
        'Hög tyngdpunkt är den vanligaste orsaken till vältor i rondeller.',
    })
  }

  // Ojämn belastning mellan kolumner — ett tungt kolli ensamt i en ände.
  const loaded = profile.perColumn.filter(w => w > 0)
  if (loaded.length >= 3 && profile.totalWeight > 0) {
    const snitt = profile.totalWeight / TRAILER_COLS
    if (profile.heaviestColumn > snitt * 2.6) {
      tips.push({
        id: 'point-load',
        tone: 'warn',
        title: 'Vikten är koncentrerad till en punkt',
        fix:
          'Sprid ut de tunga kollina över flaket i stället för att samla dem. Punktlast ' +
          'belastar både golvet och enskilda axlar hårdare än nödvändigt.',
      })
    }
  }

  if (m.securing < 80) {
    tips.push({
      id: 'securing-low',
      tone: m.securing < 50 ? 'bad' : 'warn',
      title: `Lastsäkringen räcker inte · ${m.securing} %`,
      fix:
        'Lägg fler spännband — minst två per tungt, högt eller ömtåligt kolli. ' +
        'Lastnät håller ihop det som ligger löst, mellanväggen låser lasten i längsled.',
    })
  }

  if (m.fillPercent < 45) {
    tips.push({
      id: 'fill-low',
      tone: 'warn',
      title: `Låg fyllnadsgrad · ${m.fillPercent} %`,
      fix:
        'Lasta mer gods per transport. Halvtomma bilar ger både sämre lönsamhet och ' +
        'högre utsläpp per levererat kolli — och lös last rör sig mer.',
    })
  }

  if (tips.length === 0 && m.stackScore >= 90 && m.securing >= 80) {
    tips.push({
      id: 'all-good',
      tone: 'good',
      title: 'Lasten är byggd enligt boken',
      fix: 'Tungt underst, låg tyngdpunkt, tight lastning och tillräcklig säkring. Kör hem den.',
    })
  }

  return tips
}
