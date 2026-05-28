import { format, isPast, parseISO } from 'date-fns'
import { Calendar, AlertCircle, Pencil, Trash2 } from 'lucide-react'

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' }
const PRIORITY_ICONS = { low: '↓', medium: '→', high: '↑' }

export function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  return (
    <span className={`badge badge-${priority}`}>
      {PRIORITY_ICONS[priority]} {priority}
    </span>
  )
}

export function Avatar({ name, color, size = 'xs' }) {
  const s = size === 'xs' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'
  return (
    <div
      className={`${s} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: color || '#6366f1' }}
      title={name}
    >
      {name?.[0]?.toUpperCase()}
    </div>
  )
}

export default function TaskCard({ task, onEdit, onDelete, showProject = false }) {
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done'

  return (
    <div className="card p-4 hover:border-slate-700 transition-all duration-150 animate-fade-in group">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className={`text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-100'}`}>
              {task.title}
            </h3>
            <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button onClick={() => onEdit(task)} className="p-1 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded transition-colors">
                  <Pencil size={12} />
                </button>
              )}
              {onDelete && (
                <button onClick={() => onDelete(task)} className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {showProject && task.project_name && (
              <span className="badge" style={{ backgroundColor: (task.project_color || '#6366f1') + '22', color: task.project_color || '#818cf8' }}>
                {task.project_name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/60">
        <div className="flex items-center gap-2">
          {task.assignee_name && (
            <div className="flex items-center gap-1.5">
              <Avatar name={task.assignee_name} color={task.assignee_color} size="xs" />
              <span className="text-xs text-slate-500">{task.assignee_name}</span>
            </div>
          )}
          {!task.assignee_name && (
            <span className="text-xs text-slate-600">Unassigned</span>
          )}
        </div>

        {task.due_date && (
          <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}>
            {isOverdue ? <AlertCircle size={12} /> : <Calendar size={12} />}
            {format(parseISO(task.due_date), 'MMM d')}
          </div>
        )}
      </div>
    </div>
  )
}
