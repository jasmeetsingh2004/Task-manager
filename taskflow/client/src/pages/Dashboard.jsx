import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import TaskCard from '../components/TaskCard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { CheckSquare, Clock, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react'

const STATUS_COLORS = {
  todo: '#475569', in_progress: '#3b82f6', review: '#f59e0b', done: '#10b981'
}
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' }

function StatCard({ icon: Icon, label, value, sub, color, loading }) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{loading ? '—' : value}</div>
        <div className="text-sm text-slate-400 font-medium">{label}</div>
        {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs">
      <div className="font-medium text-white">{STATUS_LABELS[label] || label}</div>
      <div className="text-slate-300">{payload[0].value} tasks</div>
    </div>
  )
}

export default function Dashboard() {
  const { user, apiFetch } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/tasks/stats')
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [apiFetch])

  const chartData = stats?.statusCounts?.map(s => ({
    name: s.status,
    count: s.count,
  })) || []

  const totalTasks = chartData.reduce((a, b) => a + b.count, 0)
  const doneTasks = chartData.find(d => d.name === 'done')?.count || 0
  const progress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">
          Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 text-sm">Here's what's happening across your projects.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={CheckSquare} label="Total Tasks" loading={loading}
          value={totalTasks} sub="across all projects"
          color="bg-indigo-600"
        />
        <StatCard
          icon={TrendingUp} label="Completed" loading={loading}
          value={`${progress}%`} sub={`${doneTasks} of ${totalTasks} done`}
          color="bg-emerald-600"
        />
        <StatCard
          icon={Clock} label="Assigned to Me" loading={loading}
          value={stats?.myTasks?.count ?? '—'}
          sub="pending tasks"
          color="bg-blue-600"
        />
        <StatCard
          icon={AlertTriangle} label="Overdue" loading={loading}
          value={stats?.overdue?.count ?? '—'}
          sub="need attention"
          color="bg-red-600"
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Chart */}
        <div className="lg:col-span-3 card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Tasks by Status</h2>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : chartData.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={40}>
                <XAxis
                  dataKey="name"
                  tickFormatter={v => STATUS_LABELS[v] || v}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-600 text-sm">No tasks yet</div>
          )}
        </div>

        {/* Priority breakdown */}
        <div className="lg:col-span-2 card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Open by Priority</h2>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800 rounded-lg animate-pulse" />)}
            </div>
          ) : stats?.priorityCounts?.length ? (
            <div className="space-y-3">
              {['high','medium','low'].map(p => {
                const item = stats.priorityCounts.find(x => x.priority === p)
                const count = item?.count || 0
                const max = Math.max(...stats.priorityCounts.map(x => x.count), 1)
                const COLORS = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-slate-500' }
                return (
                  <div key={p}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400 capitalize">{p} priority</span>
                      <span className="font-medium text-slate-300">{count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${COLORS[p]}`}
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-slate-600 text-sm text-center py-8">No open tasks</div>
          )}
        </div>
      </div>

      {/* Recent tasks */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300">Recent Tasks</h2>
          <Link to="/tasks" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-900 rounded-xl animate-pulse" />)}
          </div>
        ) : stats?.recentTasks?.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.recentTasks.map(task => (
              <TaskCard key={task.id} task={task} showProject />
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="text-slate-500 text-sm">No tasks yet. Create a project to get started!</p>
            <Link to="/projects" className="btn-primary mt-4 inline-flex">Go to Projects</Link>
          </div>
        )}
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}
