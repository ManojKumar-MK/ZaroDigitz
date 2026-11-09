import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { LuCamera, LuImageUp, LuRotateCw } from 'react-icons/lu';

/*
 * Try it before ordering: the personalised design placed in a scene that tilts with the
 * pointer, or over the customer's own camera (drag, resize, rotate, take a photo).
 * `src` is the rendered preview image; `kind` is 'calendar' | 'diary' | 'wedding' | 'notebook'.
 */

const SCENES = {
  calendar: { wall: '#EFE6DA', table: '#8A5A3B', label: 'On your desk', tilt: 'rotateX(8deg)', width: '62%', bottom: '24%' },
  diary: { wall: '#E6E0D6', table: '#5C3B28', label: 'On your desk', tilt: 'rotateX(48deg) rotateZ(-8deg)', width: '42%', bottom: '10%' },
  wedding: { wall: '#F1E6DC', table: '#B98B6A', label: 'On the table', tilt: 'rotateX(50deg) rotateZ(6deg)', width: '40%', bottom: '8%' },
  notebook: { wall: '#E9E4DC', table: '#6B4A33', label: 'On the table', tilt: 'rotateX(46deg) rotateZ(-6deg)', width: '42%', bottom: '10%' },
};

export function SceneView({ src, kind = 'wedding' }) {
  const s = SCENES[kind] || SCENES.wedding;
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rx = useSpring(useTransform(py, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 14 });
  const ry = useSpring(useTransform(px, [-0.5, 0.5], [-8, 8]), { stiffness: 120, damping: 14 });
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  return (
    <div className="relative w-full aspect-[4/3] overflow-hidden select-none" style={{ background: s.wall, perspective: 1100 }} onPointerMove={onMove} onPointerLeave={() => { px.set(0); py.set(0); }}>
      {/* window light on the wall */}
      <div className="absolute right-[8%] top-[8%] w-[22%] h-[34%] bg-white/50" aria-hidden="true" />
      {/* the table */}
      <div className="absolute inset-x-0 bottom-0 h-[42%]" style={{ background: s.table }} aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-[42%] h-2 bg-black/10" aria-hidden="true" />
      {/* props */}
      {kind === 'calendar' && <div className="absolute left-[8%] bottom-[30%] w-[12%] aspect-square rounded-b-[40%] bg-[#2E6B4F]" aria-hidden="true"><div className="absolute -top-[60%] left-1/2 -translate-x-1/2 w-[140%] aspect-square rounded-full bg-[#3F8A63]/80" /></div>}
      {kind !== 'calendar' && <div className="absolute right-[10%] bottom-[16%] w-[11%] aspect-square rounded-full bg-[#F7F2EA] ring-[6px] ring-[#E3D9CB]" aria-hidden="true"><div className="absolute inset-[22%] rounded-full bg-[#6B3E22]" /></div>}
      {kind === 'wedding' && <div className="absolute left-[12%] bottom-[12%] w-[30%] aspect-[7/5] bg-[#EFE3CF]" style={{ transform: 'perspective(900px) rotateX(52deg) rotateZ(-14deg)' }} aria-hidden="true"><div className="absolute inset-0" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 55%)', background: '#E3D3B8' }} /></div>}
      {(kind === 'diary' || kind === 'notebook') && <div className="absolute left-[16%] bottom-[18%] w-[26%] h-[2.2%] bg-[#211114] rounded-full" style={{ transform: 'rotate(-18deg)' }} aria-hidden="true" />}

      <motion.div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: s.bottom, width: s.width, rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}>
        <img src={src} alt="Your design in a room" className="w-full h-auto block" style={{ transform: s.tilt, transformOrigin: 'bottom center', boxShadow: '0 30px 40px -10px rgba(0,0,0,0.45)' }} draggable="false" />
      </motion.div>
      <p className="absolute left-4 top-4 bg-black/55 text-white text-sm font-semibold px-3 py-1.5">{s.label} · move to tilt</p>
    </div>
  );
}

/** The design over the live camera (or an uploaded photo of the customer's space). */
export function CameraView({ src, name = 'design' }) {
  const box = useRef(null);
  const video = useRef(null);
  const [stream, setStream] = useState(null);
  const [bg, setBg] = useState(null); // uploaded photo instead of the camera
  const [error, setError] = useState('');
  const [scale, setScale] = useState(1);
  const [rot, setRot] = useState(0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const start = async () => {
    setError('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      setStream(s);
      setBg(null);
    } catch {
      setError('The camera is not available. Upload a photo of your table or wall instead.');
    }
  };
  useEffect(() => { if (video.current && stream) video.current.srcObject = stream; }, [stream]);
  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  const onUpload = (file) => {
    if (!file) return;
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setBg(URL.createObjectURL(file));
  };

  // Draw what the customer sees (background cropped like the screen, then the design) and share it.
  const snap = async () => {
    const el = box.current;
    const W = el.clientWidth; const H = el.clientHeight;
    const k = Math.min(2, window.devicePixelRatio || 1);
    const c = document.createElement('canvas');
    c.width = W * k; c.height = H * k;
    const ctx = c.getContext('2d');
    ctx.scale(k, k);
    const source = stream ? video.current : await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = bg; });
    if (source) {
      const sw = source.videoWidth || source.naturalWidth; const sh = source.videoHeight || source.naturalHeight;
      const cover = Math.max(W / sw, H / sh);
      ctx.drawImage(source, (W - sw * cover) / 2, (H - sh * cover) / 2, sw * cover, sh * cover);
    }
    const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
    const w = W * 0.45 * scale; const h = w * (img.naturalHeight / img.naturalWidth);
    ctx.save();
    ctx.translate(W / 2 + x.get(), H / 2 + y.get());
    ctx.rotate((rot * Math.PI) / 180);
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 12;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9));
    const file = new File([blob], `${name}-in-my-space.jpg`, { type: 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'My design from Zaro Digitz' }); return; } catch { /* cancelled */ } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  };

  const live = Boolean(stream || bg);
  return (
    <div className="space-y-3">
      <div ref={box} className="relative w-full aspect-[3/4] sm:aspect-[4/3] overflow-hidden bg-night touch-none select-none">
        {stream && <video ref={video} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />}
        {bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        {!live && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-[#FBF5EC]">
            <p className="text-lg max-w-[34ch]">See your design on your own table or wall. Nothing is uploaded; it stays on your phone.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={start} className="inline-flex items-center gap-2 h-12 px-5 bg-secondary text-[#211114] font-bold"><LuCamera size={18} aria-hidden="true" /> Open camera</button>
              <label className="inline-flex items-center gap-2 h-12 px-5 bg-white/10 hover:bg-white/20 font-semibold cursor-pointer"><LuImageUp size={18} aria-hidden="true" /> Use a photo<input type="file" accept="image/*" className="sr-only" onChange={(e) => onUpload(e.target.files?.[0])} /></label>
            </div>
            {error && <p className="text-sm text-[rgb(var(--accent-light-rgb))]">{error}</p>}
          </div>
        )}
        {live && (
          <motion.img
            src={src}
            alt="Your design"
            drag
            dragConstraints={box}
            dragElastic={0.1}
            style={{ x, y, width: `${45 * scale}%`, rotate: rot, left: '50%', top: '50%', translateX: '-50%', translateY: '-50%', boxShadow: '0 24px 40px -8px rgba(0,0,0,0.5)' }}
            className="absolute cursor-grab active:cursor-grabbing"
            draggable="false"
          />
        )}
      </div>
      {live && (
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end text-sm">
          <label className="grid gap-1">Size<input type="range" min="0.4" max="2" step="0.02" value={scale} onChange={(e) => setScale(Number(e.target.value))} /></label>
          <label className="grid gap-1"><span className="inline-flex items-center gap-1"><LuRotateCw size={14} aria-hidden="true" /> Turn</span><input type="range" min="-45" max="45" step="1" value={rot} onChange={(e) => setRot(Number(e.target.value))} /></label>
          <button type="button" onClick={snap} className="inline-flex items-center justify-center gap-2 h-12 px-5 bg-primary text-white font-bold hover:bg-primary-dark transition-colors"><LuCamera size={18} aria-hidden="true" /> Take photo</button>
        </div>
      )}
      {live && <p className="text-sm">Drag the design into place. Then take a photo to keep or share it.</p>}
    </div>
  );
}
