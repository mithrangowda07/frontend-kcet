import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { useTheme } from '../../contexts/ThemeContext'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-indigo-600 text-white'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`

const subLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg py-1.5 pl-6 pr-3 text-sm transition ${
    isActive
      ? 'text-indigo-600 font-medium dark:text-indigo-400'
      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
  }`

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#111827]">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-5 dark:border-slate-700">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">KCET Admin</h1>
          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{admin?.email}</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <NavLink to="/admin/dashboard" className={linkClass} end>
            Dashboard
          </NavLink>

          <div className="pt-3">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Analytics
            </p>
            <NavLink to="/admin/analytics/branch-insights" className={subLinkClass}>
              Branch Insight
            </NavLink>
          </div>

          <div className="pt-3">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Student Management
            </p>
            <NavLink to="/admin/students/approvals" className={subLinkClass}>
              College Student Approval
            </NavLink>
          </div>
        </nav>

        <div className="space-y-2 border-t border-slate-200 p-4 dark:border-slate-700">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-200"
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/admin/login')
            }}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white dark:bg-slate-700"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
