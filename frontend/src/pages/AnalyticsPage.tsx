import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from 'recharts'
import { TrendingUp, Package, ShoppingCart, AlertTriangle, Tag } from 'lucide-react'
import api from '../lib/api'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid #EBEBEB', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', fontSize: 12 }}>
      <p style={{ color: '#6B7280', marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {payload.map((p: any) => <p key={p.name} style={{ color: p.color, fontWeight: 700 }}>{p.name}: {p.value?.toLocaleString()}</p>)}
    </div>
  )
}

const ChartCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <div style={{ background: 'white', border: '1px solid #EBEBEB', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
    <div style={{ padding: '18px 20px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 4, height: 18, background: '#E31837', borderRadius: 99 }} />
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{title}</span>
          {subtitle && <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{subtitle}</p>}
        </div>
      </div>
    </div>
    <div style={{ padding: '12px 8px 16px' }}>{children}</div>
  </div>
)

export default function AnalyticsPage() {
  const { data: trends30 } = useQuery({ queryKey: ['trends-30'], queryFn: () => api.get('/analytics/order-trends?days=30').then(r => r.data) })
  const { data: movements } = useQuery({ queryKey: ['movements'], queryFn: () => api.get('/analytics/stock-movements?days=14').then(r => r.data) })
  const { data: kpis } = useQuery({ queryKey: ['kpis'], queryFn: () => api.get('/analytics/kpis').then(r => r.data) })

  const movementsByDate: Record<string, any> = {}
  movements?.forEach((m: any) => {
    if (!movementsByDate[m.date]) movementsByDate[m.date] = { date: m.date }
    movementsByDate[m.date][m.type] = m.total
  })
  const movementChartData = Object.values(movementsByDate)

  const kpiCards = [
    { label: 'Orders Today',    value: kpis?.orders_today,                           icon: ShoppingCart, color: '#E31837', bg: '#FFF5F6', border: '#FECDD3' },
    { label: 'Label Accuracy',  value: kpis ? `${kpis.label_accuracy_pct}%` : '—',   icon: Tag,          color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
    { label: 'Active Incidents',value: kpis?.active_incidents,                        icon: AlertTriangle,color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    { label: 'Total Inventory', value: kpis?.total_inventory_units?.toLocaleString(), icon: Package,      color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-in">

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="section-title">Analytics & Reporting</h1>
          <p className="section-subtitle">Operational KPIs, trends and performance metrics</p>
        </div>
        <button className="btn-secondary" style={{ fontSize: 12, padding: '7px 16px' }}>
          <TrendingUp size={13} /> Export CSV
        </button>
      </div>

      {/* KPI row */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {kpiCards.map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} style={{
              background: 'white', border: '1px solid #EBEBEB', borderRadius: 16,
              padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              borderTop: `3px solid ${color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={15} color={color} />
                </div>
              </div>
              <p style={{ fontSize: 30, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em' }}>{value ?? '—'}</p>
            </div>
          ))}
        </div>
      )}

      {/* 30-day trend */}
      <ChartCard title="Order Volume" subtitle="30-day trend">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={trends30 || []} margin={{ left: 0, right: 8 }}>
            <defs>
              <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#E31837" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#E31837" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="count" stroke="#E31837" fill="url(#aGrad)" strokeWidth={2.5} name="Orders" dot={false} activeDot={{ r: 5, fill: '#E31837', stroke: 'white', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Stock movements */}
      <ChartCard title="Stock Movements" subtitle="14-day inbound / outbound / transfer">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={movementChartData} margin={{ left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#6B7280', paddingTop: 8 }} />
            <Bar dataKey="inbound"  fill="#16A34A" radius={[4, 4, 0, 0]} name="Inbound"  maxBarSize={36} />
            <Bar dataKey="outbound" fill="#E31837" radius={[4, 4, 0, 0]} name="Outbound" maxBarSize={36} />
            <Bar dataKey="transfer" fill="#6366F1" radius={[4, 4, 0, 0]} name="Transfer" maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
