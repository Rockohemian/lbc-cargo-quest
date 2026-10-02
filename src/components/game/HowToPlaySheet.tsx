import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { HOW_TO_PLAY, LOAD_SCHOOL } from '../../data/loadSchool'
import { LOAD_MIN } from '../../data/cargoTypes'

type Tab = 'spel' | 'skola'

interface Props {
  open: boolean
  onClose: () => void
  /** Vilken flik som ska vara vald när rutan öppnas. */
  initialTab?: Tab
  /** Texten på bekräftelseknappen. */
  closeLabel?: string
}

/**
 * Introruta: vad spelet går ut på och hur man lastar rätt.
 *
 * Visas automatiskt första gången spelaren kommer till kartan och går att
 * öppna igen när som helst via frågetecknet. Lastskolan ligger i samma ruta
 * så att reglerna finns till hands innan man lastar, inte bara efteråt.
 */
export function HowToPlaySheet({ open, onClose, initialTab = 'spel', closeLabel = 'Jag är redo' }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[1400] bg-[#0a0a0a]/85 backdrop-blur-sm flex items-end sm:items-center justify-center"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full max-w-lg bg-[#f6f4ef] border-t border-black/10 flex flex-col max-h-[90%]"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
          >
            <div className="px-5 pt-5 pb-4 border-b border-black/8 flex-shrink-0">
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#00843e]">— LBC Cargo Quest</div>
              <h2 className="text-[22px] font-black tracking-tight text-[#0a0a0a] mt-1 leading-tight">
                Så går det till
              </h2>
              <p className="text-[12px] text-black/55 mt-1 leading-relaxed">
                Samla in minst <strong className="text-[#0a0a0a]">{LOAD_MIN} kolli</strong>, bygg en last som håller
                hela vägen och kör hem poängen. Betyget sätts på hur rätt du lastar — inte på hur fort du är.
              </p>
            </div>

            <div className="flex border-b border-black/8 flex-shrink-0">
              <TabButton active={tab === 'spel'} onClick={() => setTab('spel')}>Så spelar du</TabButton>
              <TabButton active={tab === 'skola'} onClick={() => setTab('skola')}>Lastskolan</TabButton>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide" data-scroll>
              {tab === 'spel' && (
                <div className="divide-y divide-black/8">
                  {HOW_TO_PLAY.map(s => (
                    <div key={s.n} className="px-5 py-4 bg-white flex items-start gap-4">
                      <span className="text-2xl leading-none mt-0.5">{s.icon}</span>
                      <span className="flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="text-[10px] font-black tabular-nums text-[#00843e]">{s.n}</span>
                          <span className="text-[15px] font-black text-[#0a0a0a]">{s.title}</span>
                        </span>
                        <span className="block text-[12px] text-black/55 mt-1 leading-relaxed">{s.text}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'skola' && (
                <div className="divide-y divide-black/8">
                  <p className="px-5 py-3 text-[12px] text-black/55 leading-relaxed bg-[#f6f4ef]">
                    Det här är knepen proffsen använder. Samma saker som spelet rättar din last mot.
                  </p>
                  {LOAD_SCHOOL.map(l => (
                    <div key={l.id} className="px-5 py-4 bg-white flex items-start gap-4">
                      <span className="text-2xl leading-none mt-0.5">{l.icon}</span>
                      <span className="flex-1">
                        <span className="block text-[15px] font-black text-[#0a0a0a]">{l.title}</span>
                        <span className="block text-[12px] text-black/60 mt-1 leading-relaxed">{l.text}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 pt-4 flex-shrink-0 border-t border-black/8">
              <button
                onClick={onClose}
                className="w-full h-12 bg-[#0a0a0a] text-white text-[11px] font-black uppercase tracking-[0.22em] active:bg-[#00843e] transition-colors"
              >
                {closeLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        'flex-1 h-11 text-[10px] font-black uppercase tracking-[0.22em] transition-colors ' +
        (active ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black/45 active:bg-black/[0.03]')
      }
    >
      {children}
    </button>
  )
}
