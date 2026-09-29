import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase, harSupabase } from '../../lib/supabase'
import { useGameStore } from '../../store/gameStore'
import { GlassCard } from '../ui/GlassCard'
import { Button } from '../ui/Button'
import { ScrollHint } from '../ui/ScrollHint'

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
  const scrollRef = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [entries, setEntries] = useState<AdminEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today')
  const [winner, setWinner] = useState<AdminEntry | null>(null)

  const handleLogin = async () => {
    setLoginError(null)
    if (!harSupabase) { setLoginError('Databasen är inte konfigurerad (VITE_SUPABASE_URL saknas)'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) { setLoginError('Fel e-post eller lösenord'); return }
    setLoggedIn(true)
  }

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    let q = supabase
      .from('scores')
      .select('id, player_name, score, grade, submitted_at, contacts(phone_number)')
      .order('score', { ascending: false })
    if (dateFilter === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      q = q.gte('submitted_at', today.toISOString())
    }
    const { data, error } = await q
    // Ett tyst fel här är värre än inget svar alls — en tom lista ser likadan ut
    // som "ingen har spelat", och då letar man fel när det är bråttom.
    if (error) setFetchError(error.message)
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

  /** Exportera deltagarlistan så dragningen kan göras och sparas utanför appen. */
  const exportCsv = () => {
    const rows = [
      ['Placering', 'Namn', 'Poang', 'Betyg', 'Telefon', 'Inlamnat'],
      ...entries.map((e, i) => [
        String(i + 1),
        e.player_name,
        String(e.score),
        e.grade,
        e.contacts?.[0]?.phone_number ?? '',
        new Date(e.submitted_at).toLocaleString('sv-SE'),
      ]),
    ]
    const csv = rows
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n')
    // BOM så att Excel läser åäö rätt.
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cargo-quest-${dateFilter === 'today' ? new Date().toISOString().slice(0, 10) : 'alla'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /** Slumpa fram en vinnare bland dem som lämnat telefonnummer. */
  const drawWinner = () => {
    const deltagare = entries.filter(e => e.contacts?.[0]?.phone_number)
    if (deltagare.length === 0) return
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    setWinner(deltagare[buf[0] % deltagare.length])
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

          {!harSupabase && (
            <div className="border border-amber-500/40 bg-amber-500/10 px-4 py-3 rounded-xl">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Databasen är inte inkopplad</div>
              <p className="text-amber-100/80 text-xs mt-1.5 leading-relaxed">
                Bygget saknar <code className="font-mono">VITE_SUPABASE_URL</code> och{' '}
                <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>. Inga resultat sparas och
                ingen inloggning kan göras förrän de finns med i bygget.
              </p>
              <p className="text-amber-100/60 text-[11px] mt-2 leading-relaxed">
                Lägg in dem som GitHub-secrets och kör om deployen, så följer de med nästa build.
              </p>
            </div>
          )}

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
    <div ref={scrollRef} data-scroll className="fixed inset-0 bg-surface-900 overflow-y-auto">
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

          {/* Vinstdragning och export */}
          <div className="flex gap-2">
            <button
              onClick={drawWinner}
              disabled={entries.length === 0}
              className={
                'flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ' +
                (entries.length === 0
                  ? 'bg-white/5 text-white/25 cursor-not-allowed'
                  : 'bg-lbc-green text-white')
              }
            >
              🎲 Dra vinnare
            </button>
            <button
              onClick={exportCsv}
              disabled={entries.length === 0}
              className={
                'flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors ' +
                (entries.length === 0
                  ? 'bg-white/5 text-white/25 border-white/10 cursor-not-allowed'
                  : 'bg-white/8 text-white/70 border-white/15')
              }
            >
              ⬇ Exportera CSV
            </button>
          </div>

          {winner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border border-lbc-green/50 bg-lbc-green/10 px-4 py-4 rounded-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-lbc-green">🎉 Vinnare</div>
                  <div className="text-white font-black text-lg mt-1 truncate">{winner.player_name}</div>
                  <div className="text-white/70 text-sm font-mono mt-0.5">📞 {winner.contacts?.[0]?.phone_number ?? '—'}</div>
                  <div className="text-white/40 text-xs mt-1">
                    {winner.score.toLocaleString('sv-SE')} p · betyg {winner.grade} · {formatTime(winner.submitted_at)}
                  </div>
                </div>
                <button onClick={() => setWinner(null)} className="text-white/40 text-lg leading-none" aria-label="Stäng">✕</button>
              </div>
            </motion.div>
          )}

          {fetchError && (
            <div className="border border-red-500/40 bg-red-500/10 px-4 py-3 rounded-xl">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-red-300">Kunde inte hämta resultat</div>
              <p className="text-red-100/80 text-xs mt-1.5 font-mono break-words">{fetchError}</p>
            </div>
          )}

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
      <ScrollHint targetRef={scrollRef} bottomOffset={20} tone="light" />
    </div>
  )
}
