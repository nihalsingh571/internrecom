import { useNotifications } from './NotificationContainer'

export default function NotificationTrigger() {
  const { success, error, info, warning } = useNotifications()

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs text-slate-700">
      <h4 className="text-sm font-semibold text-slate-900 mb-2">
        Notification demo
      </h4>
      <p className="mb-3 text-[11px] text-slate-500">
        Use these buttons to trigger different notification types.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            success(
              'Skill Verified Successfully',
              'Your Python skill has been verified with VSPS score 0.91.',
            )
          }
          className="rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
        >
          Success
        </button>
        <button
          type="button"
          onClick={() =>
            error(
              'Assessment Failed',
              'Accuracy below threshold. Please retake the assessment.',
            )
          }
          className="rounded-full bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-700"
        >
          Error
        </button>
        <button
          type="button"
          onClick={() =>
            info(
              'New Internship Matches Found',
              'We discovered new roles that match your verified skills.',
            )
          }
          className="rounded-full bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700"
        >
          Info
        </button>
        <button
          type="button"
          onClick={() =>
            warning(
              'Tab switching detected',
              'Your assessment session recorded a tab switch event.',
            )
          }
          className="rounded-full bg-amber-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-600"
        >
          Warning
        </button>
      </div>
    </div>
  )
}

