import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Plus, FolderKanban, Loader2, X, Users, CheckSquare } from 'lucide-react'

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f97316','#10b981','#06b6d4','#f59e0b','#ef4444']

function NewProjectModal({ onClose, onCreated }) {
  const { apiFetch } = useAuth()
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const { project } = await apiFetch('/projects', { method: 'POST', body: JSON.stringify(form) })
      onCreated(project)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">New Project</h2>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Project Name *</label>
            <input className="input" placeholder="e.g. Website Redesign" value={form.name}
              onChange={e => set('name', e.target.value)} required autoFocus />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} placeholder="What's this project about?"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => set('color', c)}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Projects() {
  const { apiFetch } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    apiFetch('/projects')
      .then(d => setProjects(d.projects))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [apiFetch])

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Projects</h1>
          <p className="text-slate-400 text-sm">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> New Project
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-44 bg-slate-900 rounded-xl animate-pulse" />)}
        </div>
      ) : projects.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <Link key={p.id} to={`/projects/${p.id}`}
              className="card p-5 hover:border-slate-700 transition-all duration-150 hover:shadow-lg hover:shadow-black/20 group animate-fade-in block"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: p.color + '22' }}
                >
                  <FolderKanban size={18} style={{ color: p.color }} />
                </div>
                {p.my_role && (
                  <span className={`badge text-[10px] ${p.my_role === 'admin' ? 'bg-indigo-600/20 text-indigo-400' : 'bg-slate-700 text-slate-400'}`}>
                    {p.my_role}
                  </span>
                )}
              </div>

              <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors mb-1 line-clamp-1">
                {p.name}
              </h3>
              {p.description && (
                <p className="text-xs text-slate-500 mb-4 line-clamp-2">{p.description}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-500 mt-auto pt-3 border-t border-slate-800/60">
                <span className="flex items-center gap-1">
                  <Users size={12} /> {p.member_count}
                </span>
                <span className="flex items-center gap-1">
                  <CheckSquare size={12} /> {p.task_count} tasks
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-16 text-center">
          <FolderKanban size={40} className="text-slate-700 mx-auto mb-4" />
          <h3 className="text-slate-400 font-medium mb-2">No projects yet</h3>
          <p className="text-slate-600 text-sm mb-6">Create your first project to start managing tasks</p>
          <button onClick={() => setShowModal(true)} className="btn-primary inline-flex">
            <Plus size={16} /> Create Project
          </button>
        </div>
      )}

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={p => setProjects(ps => [p, ...ps])}
        />
      )}
    </div>
  )
}
