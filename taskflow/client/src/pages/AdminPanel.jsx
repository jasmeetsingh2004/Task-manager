import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Avatar } from '../components/Layout'
import { Shield, Trash2, Users, Crown, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'

export default function AdminPanel() {
  const { user: currentUser, apiFetch } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/users')
      .then(d => setUsers(d.users))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [apiFetch])

  const handleRoleChange = async (userId, newRole) => {
    try {
      const { user } = await apiFetch(`/users/${userId}/role`, {
        method: 'PATCH', body: JSON.stringify({ system_role: newRole })
      })
      setUsers(us => us.map(u => u.id === userId ? { ...u, system_role: user.system_role } : u))
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (userId, name) => {
    if (!confirm(`Permanently delete user "${name}"? This cannot be undone.`)) return
    try {
      await apiFetch(`/users/${userId}`, { method: 'DELETE' })
      setUsers(us => us.filter(u => u.id !== userId))
    } catch (err) {
      alert(err.message)
    }
  }

  const admins = users.filter(u => u.system_role === 'admin').length
  const members = users.filter(u => u.system_role === 'user').length

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={18} className="text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">User Management</h1>
        </div>
        <p className="text-slate-400 text-sm">Manage all users and their system-level permissions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-600/10' },
          { label: 'Admins', value: admins, icon: Crown, color: 'text-amber-400', bg: 'bg-amber-600/10' },
          { label: 'Members', value: members, icon: Users, color: 'text-slate-400', bg: 'bg-slate-700/30' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${bg}`}>
              <Icon size={16} className={color} />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{loading ? '—' : value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">All Users</span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-800 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {users.map(u => (
              <div key={u.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-800/30 transition-colors">
                <Avatar user={u} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">{u.name}</span>
                    {u.id === currentUser.id && (
                      <span className="text-xs bg-indigo-600/20 text-indigo-400 px-2 py-0.5 rounded-full">You</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </div>

                <div className="text-xs text-slate-600">
                  {u.project_count || 0} project{u.project_count !== 1 ? 's' : ''}
                </div>

                <div className="text-xs text-slate-600">
                  {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                </div>

                {/* Role selector */}
                <div className="relative">
                  <select
                    value={u.system_role}
                    onChange={e => handleRoleChange(u.id, e.target.value)}
                    disabled={u.id === currentUser.id}
                    className={`appearance-none text-xs font-medium px-3 py-1.5 pr-7 rounded-lg border cursor-pointer transition-colors
                      ${u.system_role === 'admin'
                        ? 'bg-amber-600/10 border-amber-600/30 text-amber-400'
                        : 'bg-slate-700/50 border-slate-600 text-slate-400'
                      } disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                  >
                    <option value="admin">Admin</option>
                    <option value="user">Member</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                </div>

                {u.id !== currentUser.id && (
                  <button
                    onClick={() => handleDelete(u.id, u.name)}
                    className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-slate-600 text-center">
        💡 The first registered user is automatically granted System Admin access.
        Admins can view all projects, manage users, and access all tasks.
      </div>
    </div>
  )
}
