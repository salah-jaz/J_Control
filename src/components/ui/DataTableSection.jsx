export function TableSectionHeader({ title, summary }) {
  return (
    <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center bg-slate-50/50">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{title}</h3>
      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded self-start sm:self-auto">
        {summary}
      </span>
    </div>
  );
}

export function TablePagination({
  summary,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
}) {
  return (
    <div className="px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-slate-50/50">
      <span className="text-[13px] text-slate-500">{summary}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={previousDisabled}
          className="px-3 py-1.5 rounded border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="px-3 py-1.5 rounded border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
        >
          Next
        </button>
      </div>
    </div>
  );
}
