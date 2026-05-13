import { X } from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useRef } from 'react';

export default function SlideOver({ isOpen, onClose, title, children, footer, size = 'md' }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const sizes = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-2xl',
    '2xl': 'max-w-4xl',
    'full': 'max-w-[95vw]'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Backdrop with sophisticated blur */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[6px] animate-in fade-in duration-300" 
        onClick={onClose}
      />

      <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full">
        <div 
          ref={panelRef}
          className={clsx(
            "pointer-events-auto w-screen transform transition duration-500 ease-in-out sm:duration-700 animate-in slide-in-from-right-full",
            sizes[size] || sizes.md
          )}
        >
          <div className="flex h-full flex-col bg-white shadow-2xl border-l border-slate-200">
            {/* Premium Header */}
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
              <div className="flex flex-col">
                <h2 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.15em] leading-none">{title}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                  Interactive Processing Mode
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-95"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Content Area with smooth scroll */}
            <div className="relative flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
              {children}
            </div>

            {/* Standardized Premium Footer */}
            {footer && (
              <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 backdrop-blur-md flex items-center">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
