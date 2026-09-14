// app/components/ConfirmDialog.jsx - [Rückfrage vor Aktionen, die sich nicht zurücknehmen lassen]
'use client';

export default function ConfirmDialog({
  icon = '⚠️',
  title,
  message,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  onConfirm,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
      <div role="dialog" aria-modal="true" className="bg-white dark:bg-zinc-950 max-w-sm w-full rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-zinc-800 text-center">
        <span className="text-4xl mb-4 block">{icon}</span>
        <h3 className="text-lg font-bold text-[#D31329] tracking-tight">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-3 leading-relaxed">{message}</p>
        <div className="h-px w-full bg-gray-200/60 dark:bg-zinc-800 my-6" />
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="w-1/2 py-4 bg-gray-100 dark:bg-zinc-900 hover:bg-gray-200 text-gray-600 dark:text-zinc-300 font-bold rounded-2xl text-sm transition-all active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="w-1/2 py-4 bg-[#D31329] hover:bg-[#b01020] text-white font-bold rounded-2xl text-sm transition-all active:scale-95"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
