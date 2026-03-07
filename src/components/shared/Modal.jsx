export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 slide-up"
        onClick={e => e.stopPropagation()}
      >
        {title && <h3 className="text-lg font-semibold mb-4 dark:text-white">{title}</h3>}
        {children}
      </div>
    </div>
  )
}
