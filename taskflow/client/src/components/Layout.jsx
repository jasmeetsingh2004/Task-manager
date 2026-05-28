import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, FolderKanban, CheckSquare, Users,
  LogOut, Zap, ChevronRight, Bell
} from 'lucide-react'

function Avatar({ user, size = 'sm' }) {
  const s = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  return (
    <div
      className={`${s} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: user?.avatar_color || '#6366f1' }}
    >
      {user?.name?.[0]?.toUpperCase()}
    </div>
  )
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/tasks', icon: CheckSquare, label: 'My Tasks' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-slate-925 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-white" size={18} />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">TaskFlow</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                ${isActive
                  ? 'bg-indigo-600/20 text-indigo-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'} />
                  {label}
                  {isActive && <ChevronRight size={14} className="ml-auto text-indigo-400/60" />}
                </>
              )}
            </NavLink>
          ))}

          {user?.system_role === 'admin' && (
            <>
              <div className="pt-4 pb-1 px-3">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">Admin</span>
              </div>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                  ${isActive ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Users size={16} className={isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'} />
                    User Management
                    {isActive && <ChevronRight size={14} className="ml-auto text-indigo-400/60" />}
                  </>
                )}
              </NavLink>
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <Avatar user={user} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-200 truncate">{user?.name}</div>
              <div className="text-xs text-slate-500 truncate">{user?.system_role === 'admin' ? '⚡ Admin' : 'Member'}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-slate-950">
        <Outlet />
      </main>
    </div>
  )
}

export { Avatar }
