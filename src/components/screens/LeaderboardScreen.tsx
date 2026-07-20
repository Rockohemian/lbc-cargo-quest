import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useGameStore } from '../../store/gameStore'
import { GlassCard } from '../ui/GlassCard'
import { Button } from '../ui/Button'
import { ScrollHint } from '../ui/ScrollHint'

interface ScoreEntry {
  id: string
  player_name: string
  score: number
  grade: string
  submitted_at: string
}

const MEDAL = ['🥇', '🥈', '🥉']
const GRADE_COLORS: Record<string, string> = {
  S: '#ffd700', A: '#00a34c', B: '#2a8ae0', C: '#e0a020', D: '#e04020',
}

export function LeaderboardScreen() {
  const setScreen = useGameStore(s => s.setScreen)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [entries, setEntries] = useState<ScoreEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Hidden admin trigger: 5 snabba tryck på troféen
  const adminTaps = useRef(0)
  const adminTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleAdminTap = () => {
    adminTaps.current += 1
    if (adminTimer.current) clearTimeout(adminTimer.current)
    adminTimer.current = window.setTimeout(() => { adminTaps.current = 0 }, 1500)
    if (adminTaps.current >= 5) {
      adminTaps.current = 0
      setScreen('admin')
    }
  }

  const fetchTop3 = async () => {
    setLoading(true)
    setError(false)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data, error: err } = await supabase
      .from('scores')
      .select('id, player_name, score, grade, submitted_at')
      .gte('submitted_at', today.toISOString())
      .order('score', { ascending: false })
      .limit(3)
    if (err) setError(true)
    else setEntries(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchTop3() }, [])

  return (
    <div ref={scrollRef} data-scroll className="fixed inset-0 bg-surface-900 overflow-y-auto">
      <div className="min-h-full flex flex-col items-center px-4 pt-14 pb-10">
        <div className="w-full max-w-sm space-y-4">

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center pt-6"
          >
            <button
              onClick={handleAdminTap}
              className="text-5xl mb-2 block mx-auto select-none active:scale-90 transition-transform"
            >
              🏆
            </button>
            <h1 className="text-xl font-black text-white">Dagens topplista</h1>
            <p className="text-white/40 text-xs mt-1">Bästa spelarna idag</p>
          </motion.div>

          <GlassCard className="p-4">
            {loading ? (
              <div className="text-center py-8 text-white/40 text-sm">Laddar...</div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-2xl mb-2">⚠️</div>
                <p className="text-white/40 text-sm">Kunde inte hämta topplistan</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-white/50 text-sm font-bold">Inga spel idag ännu</p>
                <p className="text-white/30 text-xs mt-1">Spela en omgång och skicka in ditt resultat!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((e, i) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3.5"
                  >
                    <span className="text-2xl w-8 text-center">{MEDAL[i]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-white text-sm truncate">{e.player_name}</div>
                      <div className="text-white/40 text-xs">{e.score.toLocaleString('sv-SE')} poäng</div>
                    </div>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0"
                      style={{
                        color: GRADE_COLORS[e.grade] ?? '#fff',
                        background: (GRADE_COLORS[e.grade] ?? '#fff') + '22',
                      }}
                    >
                      {e.grade}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>

          <button
            onClick={fetchTop3}
            className="w-full text-center text-white/35 text-xs py-2 active:text-white/60 transition-colors"
          >
            🔄 Uppdatera
          </button>

          <Button fullWidth size="md" variant="secondary" onClick={() => setScreen('profile')}>
            ← Tillbaka
          </Button>
        </div>
      </div>
      <ScrollHint targetRef={scrollRef} bottomOffset={20} tone="light" />
    </div>
  )
}
