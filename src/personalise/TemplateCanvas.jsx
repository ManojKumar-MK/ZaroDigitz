import { AnimatePresence, motion } from 'framer-motion';
import { displayText, fontFamily } from './templates';

/**
 * The design with its boxes filled in, drawn in HTML so it updates as the customer types.
 * Box positions and font sizes are fractions of the design's width, so it looks the same at
 * any size. `editing` shows box outlines and lets the admin pick a box.
 */
export default function TemplateCanvas({ template, values = {}, photos = {}, editing = false, selected, onSelect, onPointerDownField, className = '' }) {
  if (!template?.image) return null;
  return (
    <div className={`relative w-full select-none ${className}`} style={{ containerType: 'inline-size' }}>
      <img src={template.image} alt="" draggable="false" className="block w-full h-auto pointer-events-none" />
      {template.fields.map((f) => {
        const box = { left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 100}%`, height: `${f.h * 100}%` };
        const ring = editing ? (selected === f.id ? 'outline outline-2 outline-[#1F7A4D] bg-[#1F7A4D]/10' : 'outline outline-1 outline-dashed outline-[#1F7A4D]/70 hover:bg-[#1F7A4D]/5') : '';
        const common = {
          key: f.id,
          style: box,
          className: `absolute ${ring} ${editing ? 'cursor-move' : ''}`,
          onPointerDown: editing ? (e) => { onSelect?.(f.id); onPointerDownField?.(e, f); } : undefined,
        };
        if (f.type === 'qr') {
          const q = photos[f.id];
          return (
            <div {...common}>
              {q?.src
                ? <img src={q.src} alt="Venue QR code" draggable="false" className="w-full h-full object-contain pointer-events-none" />
                : <div className="w-full h-full bg-black/10 flex items-center justify-center text-[2.4cqw] font-bold text-black/60">QR</div>}
            </div>
          );
        }
        if (f.type === 'photo') {
          const p = photos[f.id];
          return (
            <div {...common}>
              <div className={`w-full h-full overflow-hidden ${f.shape === 'circle' ? 'rounded-full' : ''} ${p?.src ? '' : 'bg-black/10 flex items-center justify-center'}`}>
                {p?.src ? (
                  <img src={p.src} alt="" draggable="false" className="w-full h-full object-cover pointer-events-none" style={{ transform: `translate(${(p.x || 0) * 100}%, ${(p.y || 0) * 100}%) scale(${p.zoom || 1})` }} />
                ) : (
                  <span className="text-[2.2cqw] font-semibold text-black/60 text-center px-1">{f.label || 'Photo'}</span>
                )}
              </div>
            </div>
          );
        }
        const text = displayText(f, values);
        return (
          <div {...common}>
            <div
              className="w-full h-full flex items-center whitespace-pre-line break-words leading-[1.25]"
              style={{
                fontFamily: fontFamily(f.font),
                fontSize: `${f.size}cqw`,
                fontWeight: f.bold ? 700 : 400,
                color: f.color,
                textAlign: f.align,
                justifyContent: f.align === 'left' ? 'flex-start' : f.align === 'right' ? 'flex-end' : 'center',
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={text} initial={{ opacity: 0, y: '0.2em' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '-0.2em' }} transition={{ duration: 0.18 }} className="w-full">{text}</motion.span>
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}
