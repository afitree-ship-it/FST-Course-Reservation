/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export default function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          let bgColor = 'bg-white';
          let borderColor = 'border-slate-100';
          let iconColor = 'text-slate-500';
          let textColor = 'text-slate-700';
          let icon = <Info className="w-5 h-5" />;

          switch (toast.type) {
            case 'success':
              bgColor = 'bg-emerald-50';
              borderColor = 'border-emerald-200';
              iconColor = 'text-emerald-500';
              textColor = 'text-emerald-900';
              icon = <CheckCircle2 className="w-5 h-5 shrink-0" />;
              break;
            case 'error':
              bgColor = 'bg-rose-50';
              borderColor = 'border-rose-200';
              iconColor = 'text-rose-500';
              textColor = 'text-rose-900';
              icon = <AlertCircle className="w-5 h-5 shrink-0" />;
              break;
            case 'warning':
              bgColor = 'bg-amber-50';
              borderColor = 'border-amber-200';
              iconColor = 'text-amber-500';
              textColor = 'text-amber-900';
              icon = <AlertCircle className="w-5 h-5 shrink-0" />;
              break;
            case 'info':
              bgColor = 'bg-sky-50';
              borderColor = 'border-sky-200';
              iconColor = 'text-sky-500';
              textColor = 'text-sky-900';
              icon = <Info className="w-5 h-5 shrink-0" />;
              break;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border-l-4 shadow-lg ${bgColor} ${borderColor} ${textColor}`}
              layout
            >
              <div className={`${iconColor}`}>
                {icon}
              </div>
              <div className="flex-1 font-sans text-sm font-medium leading-relaxed">
                {toast.message}
              </div>
              <button
                onClick={() => onClose(toast.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 cursor-pointer"
                id={`toast-close-${toast.id}`}
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
