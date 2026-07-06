import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useGameStore } from '../../store/gameStore'
import { GlassCard } from '../ui/GlassCard'
import { Button } from '../ui/Button'

interface AdminEntry {
  id: string
  player_name: string
  score: number
  grade: string
  submitted_at: string
  contacts: { phone_number: string }[]
}

const GRADE_COLORS: Record<string, string> = {
  S: '#ffd700', A: '#00a34c', B: '#2a8ae0', C: '#e0a020', D: '#e04020',
}

export function AdminScreen() {
  const setScreen = useGameStore(s => s.setScreen)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [entries, setEntries] = useState<AdminEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today')

  const handleLogin = async () => {
    setLoginError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) { setLoginError('Fel e-post eller lösenord'); return }
    setLoggedIn(true)
  }

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('scores')
      .select('id, player_name, score, grade, submitted_at, contacts(phone_number)')
      .order('score', { ascending: false })
    if (dateFilter === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      q = q.gte('submitted_at', today.toISOString())
    }
    const { data } = await q
    setEntries((data as AdminEntry[]) ?? [])
    setLoading(false)
  }, [dateFilter])

  useEffect(() => {
    if (loggedIn) fetchEntries()
  }, [loggedIn, fetchEntries])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setLoggedIn(false)
    setEntries([])
    setEmail('')
    setPassword('')
  }

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  }

  // ── Login screen ─────────────────────────────────────────────────────────
  if (!loggedIn) {
    return (
      <div className="fixed inset-0 bg-surface-900 flex items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="text-5xl mb-3">🔐</div>
            <h1 className="text-xl font-black text-white">Admin-inloggning</h1>
            <p className="text-white/40 text-xs mt-1">LBC Cargo Quest</p>
          </motion.div>

          <GlassCard className="p-5 space-y-4">
            <div>
              <label className="text-[10px] text-white/50 font-bold uppercase tracking-widest">E-post</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-lbc-green"
                placeholder="admin@lbcfrakt.se"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Lösenord</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-lbc-green"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            {loginError && <p className="text-red-400 text-xs font-bold">{loginError}</p>}
            <Button fullWidth size="md" onClick={handleLogin} disabled={loading || !email || !password}>
              {loading ? 'Loggar in...' : 'Logga in'}
            </Button>
          </GlassCard>

          <button
            onClick={() => setScreen('leaderboard')}
            className="w-full text-center text-white/30 text-xs py-2"
          >
            ← Tillbaka
          </button>
        </div>
      </div>
    )
  }

  // ── Admin view ────────────────────────────────────────────────────────────
  return (
    <div data-scroll className="fixed inset-0 bg-surface-900 overflow-y-auto">
      <div className="min-h-full px-4 pt-14 pb-10">
        <div className="max-w-lg mx-auto space-y-4">

          <div className="flex items-start justify-between pt-4">
            <div>
              <h1 className="text-lg font-black text-white">Admin – Topplista</h1>
              <p className="text-white/40 text-xs mt-0.5">{entries.length} resultat inlämnade</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-red-400/80 font-bold px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20"
            >
              Logga ut
            </button>
          </div>

          {/* Datumfilter */}
          <div className="flex gap-2">
            {(['today', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={
                  'flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ' +
                  (dateFilter === f
                    ? 'bg-lbc-green text-white'
                    : 'bg-white/8 text-white/50 border border-white/10')
                }
              >
                {f === 'today' ? 'Idag' : 'Alla dagar'}
              </button>
            ))}
            <button
              onClick={fetchEntries}
              className="px-3.5 py-2.5 rounded-xl text-xs bg-white/8 text-white/50 border border-white/10"
            >
              🔄
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-white/40">Laddar...</div>
          ) : entries.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-white/40 text-sm">
                Inga resultat {dateFilter === 'today' ? 'idag' : 'ännu'}
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {entries.map((e, i) => (
                <GlassCard key={e.id} className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="text-white/30 font-black text-sm w-6 text-center flex-shrink-0">
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-white text-sm truncate">{e.player_name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-lbc-green font-bold text-xs">
                          {e.score.toLocaleString('sv-SE')} p
                        </span>
                        <span className="text-white/30 text-xs">{formatTime(e.submitted_at)}</span>
                      </div>
                      <div className="text-white/55 text-xs mt-1 font-mono">
                        📞 {e.contacts?.[0]?.phone_number ?? '—'}
                      </div>
                    </div>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl flex-shrink-0"
                      style={{
                        color: GRADE_COLORS[e.grade] ?? '#fff',
                        background: (GRADE_COLORS[e.grade] ?? '#fff') + '22',
                      }}
                    >
                      {e.grade}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          <Button fullWidth size="md" variant="secondary" onClick={() => setScreen('map')}>
            ← Tillbaka till kartan
          </Button>
        </div>
      </div>
    </div>
  )
}
