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
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col-reverse gap-2.5 w-full max-w-md px-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          let bgColor = 'bg-white/95';
          let borderColor = 'border-slate-150 border-l-slate-400';
          let iconColor = 'text-slate-500';
          let textColor = 'text-slate-700';
          let icon = <Info className="w-5 h-5" />;

          switch (toast.type) {
            case 'success':
              bgColor = 'bg-emerald-50/95 backdrop-blur-md';
              borderColor = 'border-emerald-200/80 border-l-emerald-500';
              iconColor = 'text-emerald-500';
              textColor = 'text-emerald-900';
              icon = <CheckCircle2 className="w-5 h-5 shrink-0" />;
              break;
            case 'error':
              bgColor = 'bg-rose-50/95 backdrop-blur-md';
              borderColor = 'border-rose-200/80 border-l-rose-500';
              iconColor = 'text-rose-500';
              textColor = 'text-rose-900';
              icon = <AlertCircle className="w-5 h-5 shrink-0" />;
              break;
            case 'warning':
              bgColor = 'bg-amber-50/95 backdrop-blur-md';
              borderColor = 'border-amber-200/80 border-l-amber-500';
              iconColor = 'text-amber-500';
              textColor = 'text-amber-900';
              icon = <AlertCircle className="w-5 h-5 shrink-0" />;
              break;
            case 'info':
              bgColor = 'bg-sky-50/95 backdrop-blur-md';
              borderColor = 'border-sky-200/80 border-l-sky-500';
              iconColor = 'text-sky-500';
              textColor = 'text-sky-900';
              icon = <Info className="w-5 h-5 shrink-0" />;
              break;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.15 } }}
              className={`pointer-events-auto flex items-center gap-3 py-3.5 px-4 rounded-xl border-l-4 shadow-xl border ${bgColor} ${borderColor} ${textColor}`}
              layout
            >
              <div className={`${iconColor}`}>
                {icon}
              </div>
              <div className="flex-1 font-sans text-sm font-semibold leading-normal">
                {toast.message}
              </div>
              <button
                onClick={() => onClose(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors shrink-0 cursor-pointer"
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
