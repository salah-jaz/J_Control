export function TableSectionHeader({ title, summary }) {
  return (
    <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100 flex flex-col sm:flex-row gap-2 sm:gap-4 sm:justify-between sm:items-center bg-gray-50/50">
      <h3 className="font-bold text-slate-800">{title}</h3>
      <span className="text-xs font-semibold text-slate-500 bg-gray-100 px-2 py-1 rounded-lg self-start sm:self-auto">
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
    <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between bg-gray-50/50">
      <span className="text-sm text-slate-600">{summary}</span>
      <div className="flex gap-2 w-full sm:w-auto">
        <button
          type="button"
          onClick={onPrevious}
          disabled={previousDisabled}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-slate-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-slate-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
        >
          Next
        </button>
      </div>
    </div>
  );
}
