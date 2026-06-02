export default function AdminDashboardHome() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Manage branch insights and review college student registrations from the sidebar.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <a
          href="/admin/analytics/branch-insights"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-600"
        >
          <h2 className="font-semibold text-slate-900 dark:text-white">Branch Insight</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Upload and manage branch insight JSON files on S3.
          </p>
        </a>
        <a
          href="/admin/students/approvals"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-600"
        >
          <h2 className="font-semibold text-slate-900 dark:text-white">College Student Approval</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Review uploaded ID cards and approve or reject studying student registrations.
          </p>
        </a>
      </div>
    </div>
  )
}
