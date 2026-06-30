import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, ShoppingCart, AlertTriangle, Tag, Activity, TrendingUp, ArrowUpRight, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'
import api from '../lib/api'
import KPICard from '../components/KPICard'
import { useWMSStore } from '../store/wmsStore'

const PIE_COLORS = ['#E31837', '#F87171', '#FCA5A5', '#FECDD3', '#C0152F']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid #EBEBEB', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', fontSize: 12 }}>
      <p style={{ color: '#6B7280', marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, fontWeight: 700 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const qc = useQueryClient()
  const notifications = useWMSStore(s => s.notifications)
  const [lastOrder, setLastOrder] = useState<any>(null)

  // Auto-refresh KPIs and trends when a new_order WS event arrives
  useEffect(() => {
    const simNotif = notifications.find(n => n.message?.startsWith('New order'))
    if (simNotif) {
      // Parse order info from notification message
      setLastOrder(simNotif.message)
      qc.invalidateQueries({ queryKey: ['kpis'] })
      qc.invalidateQueries({ queryKey: ['trends'] })
    }
  }, [notifications.length])

  const { data: kpis } = useQuery({ queryKey: ['kpis'], queryFn: () => api.get('/analytics/kpis').then(r => r.data), refetchInterval: 30000 })
  const { data: trends } = useQuery({ queryKey: ['trends'], queryFn: () => api.get('/analytics/order-trends?days=14').then(r => r.data), refetchInterval: 35000 })
  const { data: incidentSummary } = useQuery({ queryKey: ['incident-summary'], queryFn: () => api.get('/analytics/incident-summary').then(r => r.data) })

  const orderStatusData = kpis?.orders_by_status
    ? Object.entries(kpis.orders_by_status).map(([name, value]) => ({ name, value }))
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-in">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="section-title">Operations Dashboard</h1>
          <p className="section-subtitle">Real-time LogiFlow WMS overview — Maersk Global</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#F0FDF4', border: '1px solid #BBF7D0',
            borderRadius: 99, padding: '5px 12px',
            fontSize: 12, fontWeight: 600, color: '#15803D',
          }}>
            <Activity size={12} style={{ animation: 'pulseRed 2s infinite' }} />
            Live
          </div>
          <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}>
            <TrendingUp size={13} /> Export Report
          </button>
        </div>
      </div>

      {/* Live simulator ticker — hidden */}

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard title="Orders Today"     value={kpis?.orders_today ?? '—'}                           icon={ShoppingCart} color="red"    trend="up"   trendValue="+12%" />
        <KPICard title="Active Incidents" value={kpis?.active_incidents ?? '—'}                       icon={AlertTriangle} color="amber" trend="down" trendValue="-3" />
        <KPICard title="Label Accuracy"   value={kpis ? `${kpis.label_accuracy_pct}%` : '—'}          icon={Tag}          color="green"  trend="up"   trendValue="+0.4%" subtitle="AI validated" />
        <KPICard title="Total Inventory"  value={kpis?.total_inventory_units?.toLocaleString() ?? '—'} icon={Package}     color="blue"   subtitle="units across all warehouses" />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

        {/* Area chart */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 4, height: 18, background: '#E31837', borderRadius: 99 }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Order Volume</span>
              </div>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, marginLeft: 12 }}>Last 14 days</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#16A34A', fontWeight: 600, background: '#F0FDF4', padding: '4px 10px', borderRadius: 99, border: '1px solid #BBF7D0' }}>
              <ArrowUpRight size={12} /> +8.2%
            </div>
          </div>
          <div style={{ padding: '12px 8px 16px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trends || []} margin={{ left: 0, right: 8 }}>
                <defs>
                  <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#E31837" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#E31837" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#E31837" fill="url(#redGrad)" strokeWidth={2.5} name="Orders" dot={false} activeDot={{ r: 5, fill: '#E31837', stroke: 'white', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 4, height: 18, background: '#E31837', borderRadius: 99 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Orders by Status</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} dataKey="value" nameKey="name" paddingAngle={3}>
                {orderStatusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 8 }}>
            {orderStatusData.map((d, i) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Incident distribution — stacked by severity */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 4, height: 18, background: '#E31837', borderRadius: 99 }} />
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Incident Distribution</span>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>By type and severity</p>
            </div>
          </div>
          {/* Severity legend */}
          <div style={{ display: 'flex', gap: 14 }}>
            {[
              { label: 'Critical', color: '#E31837' },
              { label: 'High',     color: '#F97316' },
              { label: 'Medium',   color: '#F59E0B' },
              { label: 'Low',      color: '#9CA3AF' },
            ].map(({ label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: '12px 8px 16px' }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={incidentSummary || []}
              margin={{ left: 0, right: 8 }}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="type"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: string) => v.replace('_', ' ')}
              />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(227,24,55,0.04)' }}
              />
              <Bar dataKey="critical" stackId="a" fill="#E31837" radius={[0,0,0,0]} name="Critical" maxBarSize={48} />
              <Bar dataKey="high"     stackId="a" fill="#F97316" radius={[0,0,0,0]} name="High"     maxBarSize={48} />
              <Bar dataKey="medium"   stackId="a" fill="#F59E0B" radius={[0,0,0,0]} name="Medium"   maxBarSize={48} />
              <Bar dataKey="low"      stackId="a" fill="#9CA3AF" radius={[4,4,0,0]} name="Low"      maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
