import { useEffect, useRef } from 'react';
import { MoreVertical } from 'lucide-react';

export function ActionIconButton({
  onClick,
  title,
  icon: Icon,
  tone = 'default',
}) {
  const toneClass =
    tone === 'view'
      ? 'text-slate-400 hover:text-brand-600 hover:bg-brand-50'
      : tone === 'edit'
        ? 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
        : tone === 'delete'
          ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
          : tone === 'convert'
            ? 'text-slate-400 hover:text-violet-600 hover:bg-violet-50'
            : 'text-slate-400 hover:text-slate-700 hover:bg-gray-100';

  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2.5 rounded-lg transition-colors ${toneClass}`}
    >
      <Icon size={18} />
    </button>
  );
}

export function ActionDropdownMenu({
  isOpen,
  onToggle,
  onClose,
  items,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && menuRef.current && !menuRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.();
        }}
        className="p-2.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
      >
        <MoreVertical className="h-5 w-5" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg shadow-slate-200/50 border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
          {items.map((item) => (
            <div key={item.label}>
              {item.separatorBefore ? <div className="h-px bg-slate-100 my-1"></div> : null}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick?.();
                  onClose?.();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-[14px] font-medium transition-colors ${item.destructive ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700' : 'text-slate-700 hover:bg-violet-50 hover:text-violet-700'}`}
              >
                {item.icon ? <item.icon className="h-4 w-4" /> : null}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
