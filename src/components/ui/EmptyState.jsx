export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}>
      {Icon ? <Icon className="h-12 w-12 mb-3 text-slate-300" /> : null}
      <p className="text-lg font-semibold text-slate-700">{title}</p>
      {description ? <p className="text-sm text-slate-500 mt-1">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
