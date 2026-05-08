export default function PageHeader({
  title,
  subtitle,
  primaryAction,
  secondaryActions,
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle ? <p className="text-slate-500 mt-1">{subtitle}</p> : null}
      </div>
      <div className="flex flex-wrap items-stretch md:items-center gap-2 w-full md:w-auto">
        {secondaryActions}
        {primaryAction}
      </div>
    </div>
  );
}
