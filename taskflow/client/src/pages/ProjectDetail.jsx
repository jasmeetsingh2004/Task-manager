import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import TaskModal from '../components/TaskModal'
import TaskCard, { Avatar, StatusBadge } from '../components/TaskCard'
import {
  Plus, ArrowLeft, Users, Settings, Trash2, UserPlus, X, Loader2,
  CheckSquare, LayoutGrid, List, Crown, Shield
} from 'lucide-react'

function AddMemberModal({ projectId, onClose, onAdded }) {
  const { apiFetch } = useAuth()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const { member } = await apiFetch(`/projects/${projectId}/members`, {
        method: 'POST', body: JSON.stringify({ email, role })
      })
      onAdded(member); onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Add Member</h2>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email Address</label>
            <input type="email" className="input" placeholder="member@company.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={role} onChange={e => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 size={14} className="animate-spin" />} Add Member
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const STATUS_COLS = [
  { key: 'todo', label: 'To Do', color: 'border-slate-600' },
  { key: 'in_progress', label: 'In Progress', color: 'border-blue-500' },
  { key: 'review', label: 'Review', color: 'border-amber-500' },
  { key: 'done', label: 'Done', color: 'border-emerald-500' },
]

export default function ProjectDetail() {
  const { id } = useParams()
  const { user, apiFetch } = useAuth()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('kanban') // kanban | list
  const [tab, setTab] = useState('tasks') // tasks | members
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')

  const load = () => {
    apiFetch(`/projects/${id}`)
      .then(setData)
      .catch(e => { if (e.message.includes('403')) navigate('/projects') })
      .finally(() => setLoading(false))
  }
  useEffect(load, [id])

  const handleTaskSaved = (task) => {
    setData(d => {
      const tasks = d.tasks.filter(t => t.id !== task.id)
      return { ...d, tasks: [task, ...tasks] }
    })
  }

  const handleDeleteTask = async (task) => {
    if (!confirm(`Delete "${task.title}"?`)) return
    await apiFetch(`/tasks/${task.id}`, { method: 'DELETE' })
    setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== task.id) }))
  }

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this member?')) return
    await apiFetch(`/projects/${id}/members/${memberId}`, { method: 'DELETE' })
    setData(d => ({ ...d, members: d.members.filter(m => m.id !== memberId) }))
  }

  const handleDeleteProject = async () => {
    if (!confirm(`Delete project "${data.project.name}"? This cannot be undone.`)) return
    await apiFetch(`/projects/${id}`, { method: 'DELETE' })
    navigate('/projects')
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!data) return null

  const { project, tasks, members, myRole } = data
  const isAdmin = myRole === 'admin' || user.system_role === 'admin'
  const filteredTasks = filterStatus ? tasks.filter(t => t.status === filterStatus) : tasks

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <Link to="/projects" className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg mt-0.5 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
              <h1 className="text-xl font-bold text-white">{project.name}</h1>
            </div>
            {project.description && <p className="text-slate-400 text-sm">{project.description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button onClick={handleDeleteProject} className="btn-danger text-xs px-3 py-1.5">
                <Trash2 size={12} /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-800 pb-0">
        {[['tasks', CheckSquare, `Tasks (${tasks.length})`], ['members', Users, `Members (${members.length})`]].map(([t, Icon, label]) => (
          <button
            key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tasks Tab */}
      {tab === 'tasks' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <select className="input w-auto text-xs py-1.5" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
              <div className="flex border border-slate-700 rounded-lg overflow-hidden">
                <button onClick={() => setView('kanban')} className={`px-3 py-1.5 text-xs transition-colors ${view === 'kanban' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'}`}>
                  <LayoutGrid size={14} />
                </button>
                <button onClick={() => setView('list')} className={`px-3 py-1.5 text-xs transition-colors ${view === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'}`}>
                  <List size={14} />
                </button>
              </div>
            </div>
            <button onClick={() => setShowTaskModal(true)} className="btn-primary">
              <Plus size={15} /> Add Task
            </button>
          </div>

          {view === 'kanban' ? (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {STATUS_COLS.map(col => {
                const colTasks = filteredTasks.filter(t => t.status === col.key)
                return (
                  <div key={col.key} className="flex flex-col gap-3">
                    <div className={`flex items-center gap-2 pb-2 border-b-2 ${col.color}`}>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{col.label}</span>
                      <span className="ml-auto bg-slate-800 text-slate-500 text-xs rounded-full px-2 py-0.5">{colTasks.length}</span>
                    </div>
                    {colTasks.map(task => (
                      <TaskCard
                        key={task.id} task={task}
                        onEdit={t => { setEditTask(t); setShowTaskModal(true) }}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                    {colTasks.length === 0 && (
                      <div className="border border-dashed border-slate-800 rounded-xl p-4 text-center text-xs text-slate-700">
                        No tasks
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.length ? filteredTasks.map(task => (
                <TaskCard
                  key={task.id} task={task}
                  onEdit={t => { setEditTask(t); setShowTaskModal(true) }}
                  onDelete={handleDeleteTask}
                />
              )) : (
                <div className="card p-8 text-center text-slate-500 text-sm">No tasks found</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {tab === 'members' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-400">{members.length} member{members.length !== 1 ? 's' : ''}</span>
            {isAdmin && (
              <button onClick={() => setShowAddMember(true)} className="btn-primary">
                <UserPlus size={15} /> Add Member
              </button>
            )}
          </div>
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="card px-4 py-3 flex items-center gap-3">
                <Avatar name={m.name} color={m.avatar_color} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    {m.name}
                    {project.owner_id === m.id && <Crown size={12} className="text-amber-400" />}
                  </div>
                  <div className="text-xs text-slate-500">{m.email}</div>
                </div>
                <span className={`badge text-xs ${m.role === 'admin' ? 'bg-indigo-600/20 text-indigo-400' : 'bg-slate-700 text-slate-400'}`}>
                  {m.role === 'admin' ? <><Shield size={10}/> Admin</> : 'Member'}
                </span>
                {isAdmin && m.id !== user.id && project.owner_id !== m.id && (
                  <button onClick={() => handleRemoveMember(m.id)} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showTaskModal && (
        <TaskModal
          task={editTask}
          projectId={id}
          members={members}
          onClose={() => { setShowTaskModal(false); setEditTask(null) }}
          onSave={handleTaskSaved}
        />
      )}

      {showAddMember && (
        <AddMemberModal
          projectId={id}
          onClose={() => setShowAddMember(false)}
          onAdded={m => setData(d => ({ ...d, members: [...d.members, m] }))}
        />
      )}
    </div>
  )
}
