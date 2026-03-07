const colors = {
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  red: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  blue: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  yellow: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  gray: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
}

export function Badge({ children, color = 'blue' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}
