import clsx from 'clsx';

export function FilterSelect({
  icon: Icon,
  value,
  onChange,
  children,
  minWidthClass = '',
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-1.5 px-3.5 bg-white rounded-lg border border-slate-200 hover:border-brand-300 transition-all cursor-pointer group shadow-sm h-10 w-full sm:w-auto",
        minWidthClass
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 text-slate-500 group-hover:text-brand-500" /> : null}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[13px] py-1.5 font-medium text-slate-700 outline-none cursor-pointer w-full"
      >
        {children}
      </select>
    </div>
  );
}

export function ClearFiltersButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 px-3.5 h-10 w-full sm:w-auto text-[13px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
    >
      Clear Filters
    </button>
  );
}
