import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { FiCheck, FiAlertCircle, FiBell, FiAlertTriangle, FiX } from 'react-icons/fi';

const ToastCtx = createContext(() => {});

/** toast('Saved') / toast('Failed', 'error') / toast('New order', 'info', { sticky: true }) */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const toast = useCallback((message, type = 'success', { sticky = false, duration = 3500, action } = {}) => {
    const id = ++idRef.current;
    setToasts((list) => [...list.slice(-4), { id, message, type, action }]);
    if (!sticky) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const value = useMemo(() => toast, [toast]);
  const tone = { success: 'text-emerald-600 bg-emerald-50', error: 'text-red-600 bg-red-50', info: 'text-primary bg-orange-50', warning: 'text-amber-600 bg-amber-50' };
  const icons = { success: FiCheck, error: FiAlertCircle, info: FiBell, warning: FiAlertTriangle };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col-reverse gap-2 w-[min(92vw,380px)] pointer-events-none" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.type] || FiBell;
          return (
            <div key={t.id} className="pointer-events-auto bg-white rounded-xl shadow-lg ring-1 ring-zinc-200 px-4 py-3 flex items-start gap-3 animate-[toastIn_.25s_ease-out]">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${tone[t.type] || tone.info}`}><Icon size={15} /></span>
              <div className="flex-1 text-sm text-zinc-800 leading-snug pt-0.5">
                {t.message}
                {t.action && <button type="button" onClick={() => { t.action.onClick(); dismiss(t.id); }} className="block mt-1 text-primary font-medium hover:underline">{t.action.label}</button>}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-zinc-400 hover:text-zinc-700 pt-0.5"><FiX size={16} /></button>
            </div>
          );
        })}
      </div>
      <style>{'@keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}'}</style>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
