import { motion, useReducedMotion } from 'framer-motion';

/*
 * Hand-drawn style line sketches of the things Zaro Digitz makes. Drawn in code (original
 * artwork), ink in the current text colour and details in foil gold. Every stroke draws itself
 * when the sketch scrolls into view; with reduced motion the drawing is simply shown.
 */

const GOLD = '#C9A032';

function useDraw(delay = 0) {
  const reduce = useReducedMotion();
  if (reduce) return {};
  return {
    initial: { pathLength: 0, opacity: 0 },
    whileInView: { pathLength: 1, opacity: 1 },
    viewport: { once: true, margin: '-40px' },
    transition: { pathLength: { duration: 1.6, ease: 'easeInOut', delay }, opacity: { duration: 0.2, delay } },
  };
}

/** One stroke. `gold` paints it in foil; `d` is the path; `i` staggers it. */
function S({ d, gold = false, i = 0, w = 2.4, fill, strokeDasharray }) {
  const draw = useDraw(i * 0.12);
  return <motion.path d={d} fill={fill || 'none'} stroke={gold ? GOLD : 'currentColor'} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={strokeDasharray} {...draw} />;
}

function Frame({ title, className = '', children, viewBox = '0 0 240 240' }) {
  return (
    <svg viewBox={viewBox} role="img" aria-label={title} className={className}>
      <title>{title}</title>
      {children}
    </svg>
  );
}

/** Mango leaf hanging from a string at (x, y). */
const leaf = (x, y, len = 18) => `M${x} ${y} C${x - 6} ${y + len * 0.35} ${x - 5} ${y + len * 0.75} ${x} ${y + len} C${x + 5} ${y + len * 0.75} ${x + 6} ${y + len * 0.35} ${x} ${y} M${x} ${y + 3} L${x} ${y + len - 3}`;

export function InviteCardSketch({ className }) {
  return (
    <Frame title="Sketch of a folded wedding invitation card" className={className}>
      <S d="M58 34 L182 28 L190 214 L64 220 Z" />
      <S d="M61 37 L179 31.5 L186.5 211 L66.5 216.5" w={1.2} i={1} />
      <S d="M72 48 L172 44 L178 202 L78 206 Z" gold i={2} w={1.6} />
      {/* kalash: pot, rim, coconut and mango leaves */}
      <S d="M112 98 C104 98 100 106 104 114 C108 121 132 120 136 113 C140 106 135 97 128 97" gold i={3} />
      <S d="M110 97 L130 96" gold i={4} />
      <S d="M114 96 C112 86 128 86 126 96" gold i={4} />
      <S d="M120 86 C114 78 108 78 104 80 M120 86 C126 78 132 78 136 80 M120 86 C118 76 120 70 122 68" gold i={5} w={1.8} />
      {/* names and lines of text */}
      <S d="M98 134 C106 130 112 138 120 133 C128 128 134 136 142 132" i={6} w={2.8} />
      <S d="M112 144 L128 143.5" gold i={7} w={1.8} />
      <S d="M96 156 C104 152 110 159 118 155 C126 151 134 158 144 154" i={7} w={2.8} />
      <S d="M98 174 L142 172.5 M104 184 L138 183" i={8} w={1.4} />
      <S d="M44 210 C70 206 100 222 128 214" i={9} w={1.2} />
    </Frame>
  );
}

export function EnvelopeSketch({ className }) {
  return (
    <Frame title="Sketch of an envelope closed with a wax seal" className={className}>
      <S d="M70 46 L170 40 L174 120 L74 126 Z" i={0} w={1.6} />
      <S d="M84 60 L156 56 M86 72 L150 69 M88 84 L140 82" i={1} w={1.2} />
      <S d="M36 104 L204 96 L208 204 L40 212 Z" i={2} />
      <S d="M36 104 L122 160 L204 96" i={3} />
      <S d="M40 212 L104 150 M208 204 L140 148" i={4} w={1.4} />
      <S d="M122 160 m-17 0 a17 17 0 1 0 34 0 a17 17 0 1 0 -34 0" gold i={5} w={3} />
      <S d="M122 150 C116 156 116 164 122 170 C128 164 128 156 122 150 M112 160 L132 160" gold i={6} w={1.6} />
    </Frame>
  );
}

export function ScrollSketch({ className }) {
  return (
    <Frame title="Sketch of a royal scroll invitation with a tassel" className={className}>
      <S d="M60 54 L180 54" i={0} w={1.4} />
      <S d="M64 54 C60 54 56 60 56 66 L56 178 C56 184 60 190 64 190 L176 190 C180 190 184 184 184 178 L184 66 C184 60 180 54 176 54" i={1} />
      <S d="M48 40 C40 40 40 62 48 62 L192 62 C200 62 200 40 192 40 Z" gold i={2} />
      <S d="M48 182 C40 182 40 204 48 204 L192 204 C200 204 200 182 192 182 Z" gold i={3} />
      <S d="M92 96 C104 90 112 100 120 94 C128 88 136 98 148 92" i={4} w={2.8} />
      <S d="M100 118 L140 117 M96 134 L144 133 M104 150 L136 149" i={5} w={1.4} />
      <S d="M196 62 C206 74 206 92 200 104" gold i={6} w={1.6} />
      <S d="M200 104 L194 128 M200 104 L200 130 M200 104 L206 128" gold i={7} w={1.6} />
    </Frame>
  );
}

export function GiftBoxSketch({ className }) {
  return (
    <Frame title="Sketch of a premium invitation box tied with a ribbon" className={className}>
      <S d="M48 104 L192 96 L196 206 L52 212 Z" i={0} />
      <S d="M40 86 L200 78 L202 106 L42 114 Z" i={1} />
      <S d="M114 82 L118 210 M132 81 L136 209" gold i={2} w={2} />
      <S d="M42 98 L202 91" gold i={3} w={1.4} />
      <S d="M124 80 C100 50 78 62 92 76 C100 84 116 82 124 80 C146 50 170 60 156 74 C148 82 132 82 124 80 Z" gold i={4} />
      <S d="M124 80 L112 104 M124 80 L138 104" gold i={5} w={1.6} />
      <S d="M66 150 C76 146 84 154 94 150" i={6} w={1.2} />
    </Frame>
  );
}

export function AcrylicSketch({ className }) {
  return (
    <Frame title="Sketch of a clear acrylic invitation with a mandala" className={className}>
      <S d="M66 30 L178 30 C184 30 188 34 188 40 L188 206 C188 212 184 216 178 216 L66 216 C60 216 56 212 56 206 L56 40 C56 34 60 30 66 30 Z" i={0} />
      <S d="M70 44 L96 44 M70 52 L84 52" i={1} w={1.2} />
      <S d="M122 108 m-34 0 a34 34 0 1 0 68 0 a34 34 0 1 0 -68 0" gold i={2} w={1.6} />
      <S d="M122 108 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0" gold i={3} w={1.6} />
      <S d="M122 74 C116 86 116 96 122 108 C128 96 128 86 122 74 M156 108 C144 102 134 102 122 108 C134 114 144 114 156 108 M122 142 C128 130 128 120 122 108 C116 120 116 130 122 142 M88 108 C100 114 110 114 122 108 C110 102 100 102 88 108" gold i={4} w={1.4} />
      <S d="M96 166 C104 162 112 170 122 165 C132 160 140 168 148 164 M104 184 L140 183" i={5} w={1.8} />
      <S d="M160 40 L176 56 M168 38 L178 48" i={6} w={1.2} />
    </Frame>
  );
}

export function CalendarSketch({ className }) {
  return (
    <Frame title="Sketch of a printed desk calendar" className={className}>
      <S d="M40 196 L82 70 L158 70 L200 196 Z" i={0} />
      <S d="M82 70 L120 196 M158 70 L120 196" i={1} w={1.2} />
      <S d="M92 64 L92 78 M108 64 L108 78 M124 64 L124 78 M140 64 L140 78" gold i={2} w={2.6} />
      <S d="M78 96 C92 92 104 100 118 96" gold i={3} w={2.4} />
      <S d="M72 116 L120 116 M68 132 L120 132 M64 148 L120 148 M60 164 L120 164" i={4} w={1.2} />
      <S d="M84 108 L80 172 M100 108 L98 172" i={5} w={1.2} />
      <S d="M134 132 C140 128 146 134 152 130" gold i={6} w={1.6} />
    </Frame>
  );
}

/** A thoranam of mango leaves and marigolds: a border for the top of a section. */
export function ThoranamSketch({ className, count = 9 }) {
  const w = count * 40;
  const swag = Array.from({ length: count }, (_, i) => `M${i * 40} 10 Q${i * 40 + 20} 26 ${i * 40 + 40} 10`).join(' ');
  return (
    <Frame title="Garland of mango leaves and marigolds" className={className} viewBox={`0 0 ${w} 60`}>
      <S d={swag} i={0} w={1.6} />
      {Array.from({ length: count }, (_, i) => (
        <g key={i}>
          <S d={leaf(i * 40 + 20, 19, 26)} i={1 + (i % 4) * 0.5} w={1.4} />
          <S d={`M${i * 40} 10 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0`} gold i={2 + (i % 4) * 0.5} w={2.2} />
        </g>
      ))}
    </Frame>
  );
}

/** A small kolam: a grid of dots wrapped by looping lines. */
export function KolamSketch({ className }) {
  const dots = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) dots.push([75 + c * 30, 75 + r * 30]);
  return (
    <Frame title="A kolam of dots and loops" className={className}>
      {dots.map(([x, y], i) => <S key={i} d={`M${x} ${y} m-1.6 0 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0`} gold i={i * 0.05} w={3} />)}
      <S d="M60 120 C60 60 60 60 120 60 C180 60 180 60 180 120 C180 180 180 180 120 180 C60 180 60 180 60 120 Z" i={1} />
      <S d="M90 120 C90 90 90 90 120 90 C150 90 150 90 150 120 C150 150 150 150 120 150 C90 150 90 150 90 120 Z" i={2} />
      <S d="M120 40 L200 120 L120 200 L40 120 Z" gold i={3} w={1.6} />
      <S d="M60 60 C80 80 80 80 60 100 M180 60 C160 80 160 80 180 100 M60 180 C80 160 80 160 60 140 M180 180 C160 160 160 160 180 140" i={4} w={1.6} />
    </Frame>
  );
}

export function NotebookSketch({ className }) {
  return (
    <Frame title="Sketch of a notebook with a printed cover" className={className}>
      <S d="M62 32 L184 28 L188 214 L66 218 Z" i={0} />
      <S d="M62 32 L66 218" i={1} w={4} />
      <S d="M70 42 L70 206" i={1} w={1.2} />
      <S d="M90 60 L170 57 L172 104 L92 107 Z" gold i={2} />
      <S d="M104 76 C112 72 120 80 130 75 C140 70 148 78 158 74" i={3} w={2.6} />
      <S d="M108 92 L154 90.5" gold i={4} w={1.6} />
      <S d="M94 132 L172 129 M95 146 L172 143 M96 160 L172 157 M97 174 L172 171" i={5} w={1.2} />
      <S d="M188 60 C200 64 200 80 188 84" gold i={6} w={1.6} />
    </Frame>
  );
}

export function BillBookSketch({ className }) {
  return (
    <Frame title="Sketch of a numbered bill book" className={className}>
      <S d="M58 44 L182 40 L186 206 L62 210 Z" i={0} />
      <S d="M58 60 L182 56" i={1} w={1.2} strokeDasharray="2 6" />
      <S d="M76 74 C86 70 96 78 106 73" gold i={2} w={2.6} />
      <S d="M140 72 L168 71" gold i={3} w={2} />
      <S d="M74 98 L172 95 M74 98 L76 176 L174 173 L172 95 M74 122 L173 119 M74 146 L174 143 M140 96 L142 174" i={4} w={1.2} />
      <S d="M120 192 C130 188 140 196 150 191" i={5} w={1.6} />
      <S d="M48 216 L190 210" i={6} w={1} />
    </Frame>
  );
}

export function LabelSketch({ className }) {
  return (
    <Frame title="Sketch of a sheet of round printed labels" className={className}>
      <S d="M50 40 L190 36 L194 206 L54 210 Z" i={0} />
      {[[86, 82], [150, 80], [88, 146], [152, 144]].map(([x, y], n) => (
        <g key={n}>
          <S d={`M${x} ${y} m-24 0 a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0`} gold i={1 + n * 0.4} w={2} />
          <S d={`M${x - 12} ${y - 2} C${x - 6} ${y - 6} ${x} ${y + 2} ${x + 12} ${y - 3} M${x - 8} ${y + 8} L${x + 8} ${y + 7}`} i={2 + n * 0.4} w={1.4} />
        </g>
      ))}
      <S d="M176 186 C182 178 188 182 192 176" i={4} w={1.4} />
    </Frame>
  );
}

export function SweetBoxSketch({ className }) {
  return (
    <Frame title="Sketch of a printed sweet box with a window" className={className}>
      <S d="M40 104 L120 132 L200 104 L120 80 Z" i={0} />
      <S d="M40 104 L40 170 L120 200 L200 170 L200 104" i={1} />
      <S d="M120 132 L120 200" i={2} w={1.4} />
      <S d="M78 104 L120 118 L162 104 L120 92 Z" gold i={3} w={1.8} />
      <S d="M56 150 C66 146 76 156 88 152 M138 156 C150 152 160 160 176 154" i={4} w={1.6} />
      <S d="M110 102 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M130 104 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0" gold i={5} w={2} />
    </Frame>
  );
}

/** The sketch that fits a category, so designs without a photo still show the right kind of thing. */
export function CategorySketch({ category = '', className }) {
  if (/notebook/i.test(category)) return <NotebookSketch className={className} />;
  if (/bill|receipt/i.test(category)) return <BillBookSketch className={className} />;
  if (/label|sticker/i.test(category)) return <LabelSketch className={className} />;
  if (/sweet|cake/i.test(category)) return <SweetBoxSketch className={className} />;
  if (/scroll/i.test(category)) return <ScrollSketch className={className} />;
  if (/box|gift/i.test(category)) return <GiftBoxSketch className={className} />;
  if (/acrylic/i.test(category)) return <AcrylicSketch className={className} />;
  if (/calendar|diar/i.test(category)) return <CalendarSketch className={className} />;
  if (/visiting|stationery|printing/i.test(category)) return <EnvelopeSketch className={className} />;
  return <InviteCardSketch className={className} />;
}
