import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import TaskCard from '../components/TaskCard'
import TaskModal from '../components/TaskModal'
import { Filter, Search, Plus, CheckSquare } from 'lucide-react'

export default function Tasks() {
  const { apiFetch } = useAuth()
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [selectedProjectId, setSelectedProjectId] = useState(null)

  const [filters, setFilters] = useState({
    status: '', priority: '', assignee: '', overdue: '', search: ''
  })

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const loadTasks = useCallback(() => {
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.priority) params.set('priority', filters.priority)
    if (filters.assignee) params.set('assignee', filters.assignee)
    if (filters.overdue) params.set('overdue', filters.overdue)

    apiFetch(`/tasks?${params}`)
      .then(d => setTasks(d.tasks))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [apiFetch, filters.status, filters.priority, filters.assignee, filters.overdue])

  useEffect(loadTasks, [loadTasks])

  useEffect(() => {
    apiFetch('/projects').then(d => setProjects(d.projects)).catch(console.error)
  }, [apiFetch])

  const handleTaskSaved = (task) => {
    setTasks(ts => {
      const filtered = ts.filter(t => t.id !== task.id)
      return [task, ...filtered]
    })
  }

  const handleDelete = async (task) => {
    if (!confirm(`Delete "${task.title}"?`)) return
    await apiFetch(`/tasks/${task.id}`, { method: 'DELETE' })
    setTasks(ts => ts.filter(t => t.id !== task.id))
  }

  const searched = filters.search
    ? tasks.filter(t =>
        t.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.description?.toLowerCase().includes(filters.search.toLowerCase())
      )
    : tasks

  const activeFilters = Object.values(filters).filter(Boolean).length

  // Find members for the selected project when opening modal
  const [selectedProjectMembers, setSelectedProjectMembers] = useState([])
  const openCreateTask = () => {
    setEditTask(null)
    setSelectedProjectId(projects[0]?.id || null)
    setShowModal(true)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Tasks</h1>
          <p className="text-slate-400 text-sm">{searched.length} task{searched.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreateTask} className="btn-primary" disabled={!projects.length}>
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9 py-1.5 text-sm"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
          />
        </div>

        <select className="input w-auto text-sm py-1.5" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
        </select>

        <select className="input w-auto text-sm py-1.5" value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select className="input w-auto text-sm py-1.5" value={filters.assignee} onChange={e => setFilter('assignee', e.target.value)}>
          <option value="">All assignees</option>
          <option value="me">Assigned to me</option>
        </select>

        <select className="input w-auto text-sm py-1.5" value={filters.overdue} onChange={e => setFilter('overdue', e.target.value)}>
          <option value="">All dates</option>
          <option value="true">Overdue only</option>
        </select>

        {activeFilters > 0 && (
          <button
            onClick={() => setFilters({ status: '', priority: '', assignee: '', overdue: '', search: '' })}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-900 rounded-xl animate-pulse" />)}
        </div>
      ) : searched.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {searched.map(task => (
            <TaskCard
              key={task.id} task={task} showProject
              onEdit={t => { setEditTask(t); setSelectedProjectId(t.project_id); setShowModal(true) }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <CheckSquare size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">
            {activeFilters > 0 ? 'No tasks match your filters' : 'No tasks yet'}
          </p>
        </div>
      )}

      {showModal && (
        <TaskModal
          task={editTask}
          projectId={selectedProjectId}
          members={selectedProjectMembers}
          onClose={() => { setShowModal(false); setEditTask(null) }}
          onSave={handleTaskSaved}
        />
      )}
    </div>
  )
}
