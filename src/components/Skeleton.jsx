/**
 * Lightweight skeleton placeholders for instant perceived loading.
 * Use while data is loading from cache or network.
 */
export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200/80 ${className}`}
      {...props}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left min-w-[600px]">
        <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 rounded-lg">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-4 py-4">
                  <Skeleton className="h-4 w-full max-w-[120px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card min-h-[190px] flex flex-col justify-between p-6">
          <div className="flex justify-between items-start">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <Skeleton className="h-6 w-16 rounded" />
          </div>
          <Skeleton className="h-8 w-24 mt-2" />
          <Skeleton className="h-4 w-32 mt-1" />
          <div className="mt-auto pt-4">
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardListSkeleton({ items = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white">
          <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-5 w-3/4 max-w-[200px] mb-2" />
            <Skeleton className="h-4 w-1/2 max-w-[140px]" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
