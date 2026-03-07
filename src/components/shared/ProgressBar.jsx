export function ProgressBar({ value, max, color = 'bg-indigo-600', className = '' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 ${className}`}>
      <div
        className={`${color} h-2.5 rounded-full transition-all duration-300`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
