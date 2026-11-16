import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { useAppStore } from '@/src/store/useAppStore';

export const ToastContainer: React.FC = () => {
  const toasts = useAppStore((s) => s.toasts);
  const dismissToast = useAppStore((s) => s.dismissToast);
  const reduceMotion = useAppStore((s) => s.settings.reduceMotion);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-2 md:px-0"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon =
            toast.tone === 'success'
              ? CheckCircle2
              : toast.tone === 'warning'
              ? AlertTriangle
              : toast.tone === 'error'
              ? XCircle
              : Info;

          const iconColor =
            toast.tone === 'success'
              ? 'text-emerald-500'
              : toast.tone === 'warning'
              ? 'text-amber-500'
              : toast.tone === 'error'
              ? 'text-rose-500'
              : 'text-sky-500';

          return (
            <motion.div
              key={toast.id}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161B26] px-4 py-3 shadow-lg text-sm text-slate-900 dark:text-slate-100"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                <span className="truncate">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
