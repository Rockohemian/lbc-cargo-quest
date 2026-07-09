import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { TruckPreview } from '../game/TruckPreview'
import { generateCargoItems } from '../../utils/cargoGenerator'
import { supabase } from '../../lib/supabase'
import { ScrollHint } from '../ui/ScrollHint'

const GRADE_COLORS: Record<string, string> = { S: '#c98a00', A: '#00843e', B: '#0f5a99', C: '#c98a00', D: '#c93820' }
const GRADE_LABELS: Record<string, string> = { S: 'Legendarisk', A: 'Utmärkt', B: 'Bra', C: 'Godkänd', D: 'Under förväntan' }

export function ResultScreen() {
  const { lastResult, player, garage, resetRound, setCargoItems, playerPosition, setScreen } = useGameStore()

  if (!lastResult) { setScreen('map'); return null }

  const {
    grade, totalPoints, totalXP, cargoCount,
    fillPercent, weightBalance, securing, cargoDamage,
    ecoScore, safetyScore, qualityScore, badges, summary,
  } = lastResult
  const gradeColor = GRADE_COLORS[grade]

  const [phoneInput, setPhoneInput] = useState('')
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleSubmitScore = async () => {
    const phone = phoneInput.trim()
    if (!phone) return
    setSubmitState('submitting'); setSubmitError(null)
    const { data: scoreData, error: scoreErr } = await supabase
      .from('scores').insert({ player_name: player.name, score: totalPoints, grade })
      .select('id').single()
    if (scoreErr || !scoreData) { setSubmitState('error'); setSubmitError('Kunde inte skicka in. Kontrollera anslutning.'); return }
    const { error: contactErr } = await supabase
      .from('contacts').insert({ score_id: scoreData.id, phone_number: phone })
    if (contactErr) { setSubmitState('error'); setSubmitError('Poängen sparades men numret kunde inte kopplas.'); return }
    setSubmitState('done')
  }

  const handlePlayAgain = () => {
    resetRound()
    setCargoItems(generateCargoItems(playerPosition))
    setScreen('map')
  }

  return (
    <div
      ref={scrollRef}
      data-scroll
      className="fixed inset-0 bg-[#f6f4ef] text-[#0a0a0a] overflow-y-auto"
      style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui' }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-5 h-12 border-b border-black/8 bg-[#f6f4ef]/95 backdrop-blur-sm"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-black tracking-tight">LBC<span className="text-[#00843e]">frakt</span></span>
          <span className="text-[9px] font-black uppercase tracking-[0.22em] text-black/45">Leverans klar</span>
        </div>
        <button onClick={() => setScreen('splash')} className="text-[10px] font-black uppercase tracking-[0.22em] text-black/55 active:text-[#0a0a0a]">Stäng ✕</button>
      </div>

      {/* Hero: betyg */}
      <section className="px-5 pt-8 pb-6 text-center border-b border-black/8">
        <div className="text-[10px] font-black uppercase tracking-[0.32em] text-[#00843e] mb-3">— Leveransrapport</div>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.7, bounce: 0.35 }}
          className="text-[140px] font-black leading-none tracking-tighter tabular-nums"
          style={{ color: gradeColor }}
        >
          {grade}
        </motion.div>
        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-black/55 mt-2">{GRADE_LABELS[grade]}</div>
        <div className="mt-4 text-[32px] font-black leading-none tabular-nums">
          {totalPoints.toLocaleString('sv-SE')}
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-black/45 mt-1">Totalpoäng</div>
        <div className="mt-3 inline-block bg-[#00843e] text-white px-3 py-1 text-[12px] font-black tracking-wider">
          +{totalXP} XP
        </div>
      </section>

      {/* Omdöme */}
      <section className="px-5 py-5 border-b border-black/8">
        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-black/55 mb-2">— Transportledarens omdöme</div>
        <p className="text-[14px] leading-relaxed text-black/75">{summary}</p>
      </section>

      {/* Delpoäng-stapel */}
      <section className="border-b border-black/8">
        <div className="px-5 pt-5 pb-2 text-[10px] font-black uppercase tracking-[0.28em] text-black/55">— Leveransrapport</div>
        <div className="divide-y divide-black/8">
          <StatBar label={`Lastutnyttjande · ${cargoCount} kolli`} value={fillPercent} color="#00843e" />
          <StatBar label="Viktfördelning" value={weightBalance} color="#c98a00" />
          <StatBar label="Lastsäkring" value={securing} color="#0f5a99" />
          <StatBar label="Godsskick (oskadat)" value={100 - cargoDamage} color="#00a34c" />
        </div>
      </section>

      {/* Delbetyg */}
      <section className="grid grid-cols-3 border-b border-black/8">
        <ScoreCell label="Godsskador" value={`${cargoDamage}%`} tone={cargoDamage <= 8 ? 'good' : cargoDamage <= 25 ? 'mid' : 'bad'} />
        <ScoreCell label="Säkerhet" value={String(safetyScore)} tone={safetyScore >= 80 ? 'good' : safetyScore >= 55 ? 'mid' : 'bad'} divider />
        <ScoreCell label="Eco-index" value={String(ecoScore)} tone={ecoScore >= 80 ? 'good' : ecoScore >= 55 ? 'mid' : 'bad'} divider />
      </section>
      <section className="border-b border-black/8">
        <ScoreCell label="Kvalitetspoäng" value={String(qualityScore)} tone={qualityScore >= 80 ? 'good' : qualityScore >= 55 ? 'mid' : 'bad'} wide />
      </section>

      {/* Utmärkelser */}
      {badges.length > 0 && (
        <section className="px-5 py-5 border-b border-black/8">
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-black/55 mb-3">— Utmärkelser</div>
          <div className="grid grid-cols-1 gap-2">
            {badges.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="flex items-center gap-3 border border-black/12 bg-white px-3 py-2.5"
              >
                <span className="text-2xl" style={{ color: b.color }}>{b.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-black">{b.title}</div>
                  <div className="text-[10px] text-black/55">{b.description}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Spelarens progression */}
      <section className="px-5 py-5 border-b border-black/8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#0a0a0a] text-white flex items-center justify-center font-black text-sm">
            {player.level}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-black tracking-tight truncate">{player.rank}</div>
            <div className="text-[10px] text-black/50">{player.totalDeliveries} leveranser totalt</div>
          </div>
        </div>
        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-black/45 mb-1">
          <span>XP till nästa nivå</span>
          <span className="text-[#00843e]">{player.xp} / {player.xpToNext}</span>
        </div>
        <div className="h-[3px] bg-black/8 overflow-hidden">
          <div className="h-full bg-[#00843e]" style={{ width: `${Math.min(100, (player.xp / player.xpToNext) * 100)}%` }} />
        </div>
      </section>

      {/* Din lastbil */}
      {garage.unlocked && (
        <section className="px-5 py-5 border-b border-black/8">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-black/55">— Din lastbil</span>
            <button onClick={() => setScreen('garage')} className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00843e] active:text-[#0a0a0a]">
              Garaget →
            </button>
          </div>
          <div className="bg-white border border-black/12">
            <TruckPreview equipped={garage.equipped} view="side" className="w-full" />
          </div>
        </section>
      )}

      {/* Tävling */}
      <section className="px-5 py-5 border-b border-black/8">
        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#00843e] mb-2">— Tävla om priset</div>
        {submitState === 'done' ? (
          <div className="border border-[#00843e]/40 bg-[#00843e]/[0.04] px-4 py-4 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00843e]">Inlämnat</div>
            <div className="text-[13px] font-black mt-1">Du är med i tävlingen — lycka till!</div>
          </div>
        ) : (
          <>
            <p className="text-[12px] text-black/60 mb-3 leading-relaxed">
              Ange ditt mobilnummer för att delta i utlottningen. Vinnaren kontaktas efter mässan.
            </p>
            <input
              type="tel" value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="07X XXX XX XX"
              className="w-full h-12 px-4 bg-white border border-black/15 text-[14px] font-bold placeholder-black/25 focus:outline-none focus:border-[#00843e] transition-colors"
            />
            {submitError && <p className="text-red-700 text-[11px] mt-2 font-black uppercase tracking-widest">{submitError}</p>}
            <button
              onClick={handleSubmitScore}
              disabled={submitState === 'submitting' || !phoneInput.trim()}
              className={
                'w-full h-12 mt-3 text-[12px] font-black uppercase tracking-[0.22em] flex items-center justify-between px-5 transition-colors ' +
                (submitState === 'submitting' || !phoneInput.trim()
                  ? 'bg-black/10 text-black/40 cursor-not-allowed'
                  : 'bg-[#0a0a0a] text-white active:bg-[#00843e]')
              }
            >
              <span>{submitState === 'submitting' ? 'Skickar…' : 'Skicka in mitt resultat'}</span>
              <span className="text-base">→</span>
            </button>
          </>
        )}
      </section>

      {/* Handlingar */}
      <section className="px-5 pt-5 pb-8 space-y-2">
        <button
          onClick={handlePlayAgain}
          className="w-full h-14 bg-[#0a0a0a] text-white flex items-center justify-between px-5 text-[12px] font-black uppercase tracking-[0.22em] active:bg-[#00843e] transition-colors"
        >
          <span>Ny omgång</span>
          <span className="text-base">→</span>
        </button>
        <button
          onClick={() => setScreen('profile')}
          className="w-full h-12 border border-black/15 bg-white text-[11px] font-black uppercase tracking-[0.22em] active:bg-black/[0.04] transition-colors"
        >
          Min profil
        </button>
      </section>
      <ScrollHint targetRef={scrollRef} bottomOffset={20} />
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────
function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="px-5 py-3">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[12px] font-bold text-[#0a0a0a] truncate pr-2">{label}</span>
        <span className="text-[13px] font-black tabular-nums" style={{ color }}>{Math.round(pct)}%</span>
      </div>
      <div className="h-[3px] bg-black/8 overflow-hidden">
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function ScoreCell({ label, value, tone, wide, divider }: {
  label: string; value: string; tone: 'good' | 'mid' | 'bad'; wide?: boolean; divider?: boolean
}) {
  const color = tone === 'good' ? '#00843e' : tone === 'mid' ? '#c98a00' : '#c93820'
  return (
    <div className={'px-4 py-3 ' + (divider ? 'border-l border-black/8 ' : '') + (wide ? 'text-center' : '')}>
      <div className="text-[9px] font-black uppercase tracking-[0.22em] text-black/45 mb-1">{label}</div>
      <div className="text-[22px] font-black leading-none tabular-nums" style={{ color }}>{value}</div>
    </div>
  )
}