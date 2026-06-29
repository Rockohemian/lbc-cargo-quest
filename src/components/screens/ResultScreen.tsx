import { useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { Button } from '../ui/Button'
import { GlassCard } from '../ui/GlassCard'
import { ProgressBar } from '../ui/ProgressBar'
import { TruckPreview } from '../game/TruckPreview'
import { generateCargoItems } from '../../utils/cargoGenerator'
import { supabase } from '../../lib/supabase'

const GRADE_COLORS = { S: '#ffd700', A: '#27a349', B: '#2a8ae0', C: '#e0a020', D: '#e04020' }
const GRADE_LABELS = { S: 'Legendarisk', A: 'Utmärkt', B: 'Bra', C: 'Godkänd', D: 'Under förväntan' }

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

  const handleSubmitScore = async () => {
    const phone = phoneInput.trim()
    if (!phone) return
    setSubmitState('submitting')
    setSubmitError(null)
    const { data: scoreData, error: scoreErr } = await supabase
      .from('scores')
      .insert({ player_name: player.name, score: totalPoints, grade })
      .select('id')
      .single()
    if (scoreErr || !scoreData) {
      setSubmitState('error')
      setSubmitError('Kunde inte skicka in. Kontrollera anslutning.')
      return
    }
    const { error: contactErr } = await supabase
      .from('contacts')
      .insert({ score_id: scoreData.id, phone_number: phone })
    if (contactErr) {
      setSubmitState('error')
      setSubmitError('Poängen sparades men telefonnumret misslyckades.')
      return
    }
    setSubmitState('done')
  }

  const handlePlayAgain = () => {
    resetRound()
    setCargoItems(generateCargoItems(playerPosition))
    setScreen('map')
  }

  return (
    <div data-scroll className="fixed inset-0 bg-surface-900 overflow-y-auto">
      <div className="min-h-full flex flex-col items-center px-4 py-6 pb-10">
        <div className="w-full max-w-sm space-y-4">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-6">
            <div className="text-3xl mb-1">📦✅</div>
            <h2 className="text-lg font-black text-white">Leverans genomförd</h2>
          </motion.div>

          {/* Grade hero */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.7, bounce: 0.4 }}
            className="text-center"
          >
            <div className="text-[6.5rem] font-black leading-none mx-auto"
              style={{ color: gradeColor, textShadow: `0 0 40px ${gradeColor}88` }}>
              {grade}
            </div>
            <div className="text-white/60 font-bold">{GRADE_LABELS[grade]}</div>
            <div className="text-3xl font-black text-white mt-2">{totalPoints.toLocaleString('sv-SE')}</div>
            <div className="text-white/40 text-sm">totalpoäng</div>
            <div className="text-lbc-green font-black text-xl mt-1">+{totalXP} XP</div>
          </motion.div>

          {/* Professional summary */}
          <GlassCard className="p-4" delay={0.1}>
            <div className="text-xs font-black text-lbc-green uppercase tracking-widest mb-1.5">Transportledarens omdöme</div>
            <p className="text-white/85 text-sm leading-relaxed">{summary}</p>
          </GlassCard>

          {/* Metrics */}
          <GlassCard className="p-5" delay={0.15}>
            <h3 className="text-sm font-black text-white/60 uppercase tracking-widest mb-4">Leveransrapport</h3>
            <div className="space-y-3">
              <ProgressBar value={fillPercent} label={`📦 Lastutnyttjande · ${cargoCount} kollin`} showPct color="#1a7e34" />
              <ProgressBar value={weightBalance} label="⚖️ Viktfördelning" showPct color="#d4a017" />
              <ProgressBar value={securing} label="🔗 Lastsäkring" showPct color="#2a8ae0" />
              <ProgressBar value={100 - cargoDamage} label="✨ Godsskick (oskadat)" showPct color="#27a349" />
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
              <StatBox label="Godsskador" value={`${cargoDamage}%`} tone={cargoDamage <= 8 ? 'good' : cargoDamage <= 25 ? 'mid' : 'bad'} />
              <StatBox label="Säkerhet" value={`${safetyScore}`} tone={safetyScore >= 80 ? 'good' : safetyScore >= 55 ? 'mid' : 'bad'} />
              <StatBox label="Eco Score" value={`${ecoScore}`} tone={ecoScore >= 80 ? 'good' : ecoScore >= 55 ? 'mid' : 'bad'} />
            </div>
            <div className="mt-2 grid grid-cols-1">
              <StatBox label="Kvalitetspoäng" value={`${qualityScore}`} tone={qualityScore >= 80 ? 'good' : qualityScore >= 55 ? 'mid' : 'bad'} wide />
            </div>
          </GlassCard>

          {/* Badges */}
          {badges.length > 0 && (
            <GlassCard className="p-5" delay={0.25}>
              <h3 className="text-sm font-black text-white/60 uppercase tracking-widest mb-3">Utmärkelser</h3>
              <div className="flex flex-wrap gap-2">
                {badges.map((b, i) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35 + i * 0.1, type: 'spring' }}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 border"
                    style={{ background: b.color + '1a', borderColor: b.color + '55' }}
                  >
                    <span className="text-xl">{b.icon}</span>
                    <div>
                      <div className="text-xs font-black text-white">{b.title}</div>
                      <div className="text-xs text-white/40">{b.description}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Player progress */}
          <GlassCard className="p-5" delay={0.3}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-lbc-green flex items-center justify-center text-white font-black text-lg">
                {player.level}
              </div>
              <div className="flex-1">
                <div className="font-black text-white">{player.rank}</div>
                <div className="text-xs text-white/40">{player.totalDeliveries} leveranser totalt</div>
              </div>
            </div>
            <ProgressBar value={player.xp} max={player.xpToNext} label="XP till nästa nivå" showPct color="#1a7e34" />
          </GlassCard>

          {/* Din lastbil */}
          {garage.unlocked && (
            <GlassCard className="p-4" delay={0.35} glow>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-black text-white/60 uppercase tracking-widest">Din lastbil</h3>
                <button onClick={() => setScreen('garage')} className="text-lbc-green text-xs font-bold">🔧 Garage →</button>
              </div>
              <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg,#0a1410,#06100b)' }}>
                <TruckPreview equipped={garage.equipped} view="side" className="w-full" />
              </div>
            </GlassCard>
          )}

          {/* Tävling: skicka in poäng */}
          <GlassCard className="p-4" delay={0.4}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🏆</span>
              <span className="text-sm font-black text-white">Tävla om priset</span>
            </div>
            {submitState === 'done' ? (
              <div className="text-center py-3">
                <div className="text-3xl mb-1">✅</div>
                <p className="text-lbc-green font-black text-sm">Inlämnat!</p>
                <p className="text-white/40 text-xs mt-1">Du är med i tävlingen. Lycka till!</p>
              </div>
            ) : (
              <>
                <p className="text-white/50 text-xs mb-3 leading-relaxed">
                  Ange ditt mobilnummer för att delta. Vi kontaktar vinnaren!
                </p>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-lbc-green mb-3"
                  placeholder="07X XXX XX XX"
                />
                {submitError && <p className="text-red-400 text-xs mb-2 font-bold">{submitError}</p>}
                <Button
                  fullWidth
                  size="md"
                  onClick={handleSubmitScore}
                  disabled={submitState === 'submitting' || !phoneInput.trim()}
                >
                  {submitState === 'submitting' ? 'Skickar...' : 'Skicka in mitt resultat →'}
                </Button>
              </>
            )}
          </GlassCard>

          {/* Actions */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="space-y-2">
            <Button fullWidth size="xl" onClick={handlePlayAgain}>🗺️ Ny omgång</Button>
            <Button fullWidth size="md" variant="secondary" onClick={() => setScreen('profile')}>👤 Min profil</Button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, tone, wide }: { label: string; value: string; tone: 'good' | 'mid' | 'bad'; wide?: boolean }) {
  const color = tone === 'good' ? '#27a349' : tone === 'mid' ? '#d4a017' : '#e04020'
  return (
    <div className={`bg-white/5 rounded-xl p-2 ${wide ? '' : ''}`}>
      <div className="font-black" style={{ color }}>{value}</div>
      <div className="text-white/40 text-[10px]">{label}</div>
    </div>
  )
}
