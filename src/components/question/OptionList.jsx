const labels = ['1', '2', '3', '4']

export function OptionList({ options, selected, correctIndex, answered, onSelect, isTrueFalse }) {
  return (
    <div className="space-y-3">
      {options.map((opt, i) => {
        const isSelected = selected === i
        const isCorrect = i === correctIndex
        let classes = 'w-full text-left px-4 py-3 rounded-xl border-2 font-medium transition-all '

        if (!answered) {
          classes += 'border-slate-200 dark:border-slate-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-700 dark:text-slate-200 cursor-pointer'
        } else if (isCorrect) {
          classes += 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
        } else if (isSelected && !isCorrect) {
          classes += 'border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200'
        } else {
          classes += 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
        }

        const label = isTrueFalse ? '' : `${labels[i]}. `

        return (
          <button
            key={i}
            className={classes}
            onClick={() => !answered && onSelect(i)}
            disabled={answered}
          >
            {label}{opt}
          </button>
        )
      })}
    </div>
  )
}
