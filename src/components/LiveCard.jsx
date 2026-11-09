import { AnimatePresence, motion } from 'framer-motion';
import { LIVE_MODES, liveValues } from './liveModes';

/*
 * The live preview: the visitor's own words set on the object we will print.
 * One component for every kind of work: a wedding card, a notebook cover, a diary.
 */

const Swap = ({ k, className, children }) => (
  <AnimatePresence mode="wait">
    <motion.p key={k} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className={className}>{children}</motion.p>
  </AnimatePresence>
);

export default function LiveCard({ mode = 'wedding', values = {}, className = '' }) {
  const v = liveValues(mode, values);
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 24, rotate: -4 }}
        animate={{ opacity: 1, y: 0, rotate: -1.5 }}
        exit={{ opacity: 0, y: -16, rotate: 2 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ rotate: 0, y: -4 }}
        className={`w-full max-w-[340px] ${className}`}
        aria-live="polite"
        aria-label={`${LIVE_MODES[mode].label} preview`}
      >
        {mode === 'calendar' && (
          <div className="bg-paper text-[#211114] shadow-none">
            <div className="flex justify-center gap-6 py-2 bg-primary" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="w-2.5 h-4 rounded-full bg-[#211114]/70" />)}</div>
            <div className="px-6 pt-5 pb-4 text-center bg-[#FBF5EC]">
              <Swap k={v.town} className="font-display font-bold text-5xl tracking-tight text-primary leading-none">{v.town}</Swap>
              <p className="font-semibold mt-3">January</p>
              <div className="grid grid-cols-7 gap-1 mt-2 text-[11px] tabular-nums" aria-hidden="true">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="font-bold text-primary">{d}</span>)}
                {Array.from({ length: 35 }, (_, i) => { const day = i - 4; return <span key={i} className={day === 1 ? 'bg-secondary font-bold' : ''}>{day > 0 && day <= 31 ? day : ''}</span>; })}
              </div>
            </div>
            <div className="px-6 py-4 bg-primary text-white text-center">
              <Swap k={v.a} className="font-display font-bold text-xl leading-tight break-words">{v.a}</Swap>
              <Swap k={v.b} className="text-sm text-[rgb(var(--accent-light-rgb))] mt-1">{v.b}</Swap>
            </div>
          </div>
        )}

        {mode === 'wedding' && (
          <div className="aspect-[5/7] bg-primary text-[rgb(var(--accent-light-rgb))] p-3">
            <div className="h-full ring-2 ring-secondary ring-inset flex flex-col items-center justify-between py-8 px-5 text-center">
              <div>
                <p className="text-xl" lang="ta" aria-hidden="true">உ</p>
                <p className="text-sm mt-2" lang="ta">திருமண அழைப்பிதழ்</p>
                <p className="text-sm text-[rgb(var(--accent-light-rgb))]">Wedding invitation</p>
              </div>
              <div className="w-full">
                <Swap k={v.a} className="font-display font-bold text-3xl text-white break-words">{v.a}</Swap>
                <p className="text-secondary text-lg my-1">&amp;</p>
                <Swap k={v.b} className="font-display font-bold text-3xl text-white break-words">{v.b}</Swap>
              </div>
              <div className="text-sm">
                <Swap k={v.date} className="text-white">{v.date}</Swap>
                <Swap k={v.town}>{v.town}</Swap>
              </div>
            </div>
          </div>
        )}

        {mode === 'notebook' && (
          <div className="aspect-[3/4] bg-[#1F4E79] text-white relative flex">
            <div className="w-5 bg-[#163a5c] shrink-0" aria-hidden="true" />
            <div className="flex-1 flex flex-col justify-between p-6 text-center">
              <div className="bg-[#FBF5EC] text-[#211114] px-4 py-6 mt-6">
                <Swap k={v.a} className="font-display font-bold text-2xl leading-tight break-words">{v.a}</Swap>
                <Swap k={v.b} className="text-base mt-2">{v.b}</Swap>
              </div>
              <div className="grid grid-cols-1 gap-2 text-left text-sm" aria-hidden="true">
                {['Name', 'Class', 'Subject'].map((l) => <p key={l} className="flex gap-2">{l}<span className="flex-1 border-b-2 border-dotted border-white/50" /></p>)}
              </div>
              <Swap k={v.town} className="font-semibold text-[rgb(var(--accent-light-rgb))]">{v.town}</Swap>
            </div>
          </div>
        )}

        {mode === 'diary' && (
          <div className="aspect-[3/4] bg-[#211114] text-[rgb(var(--accent-light-rgb))] relative flex flex-col items-center justify-center text-center p-8">
            <div className="absolute right-6 top-0 bottom-0 w-3 bg-primary" aria-hidden="true" />
            <Swap k={v.town} className="font-display font-bold text-5xl tracking-tight">{v.town}</Swap>
            <p className="w-12 h-0.5 bg-secondary my-6" aria-hidden="true" />
            <Swap k={v.a} className="font-display font-semibold text-xl break-words">{v.a}</Swap>
            <Swap k={v.b} className="text-base mt-3 text-[rgb(var(--accent-light-rgb))]">{v.b}</Swap>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
