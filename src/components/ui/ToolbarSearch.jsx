import { Search } from 'lucide-react';

export default function ToolbarSearch({
  placeholder,
  value,
  onChange,
  className = '',
}) {
  return (
    <div className={`flex-1 min-w-[240px] relative group ${className}`}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors w-4 h-4" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-12 pr-5 py-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[13px] font-medium text-slate-700 shadow-inner placeholder:text-slate-400 focus:bg-white focus:border-brand-400 focus:ring-[3px] focus:ring-brand-500/15 transition-all duration-[250ms] outline-none hover:border-slate-300 h-10"
      />
    </div>
  );
}
