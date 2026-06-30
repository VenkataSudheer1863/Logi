import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { RefreshCw, Search, ChevronDown } from 'lucide-react'
import api from '../lib/api'
import clsx from 'clsx'

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  pending:    { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB', dot: '#9CA3AF' },
  processing: { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', dot: '#3B82F6' },
  picking:    { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', dot: '#F59E0B' },
  packed:     { bg: '#FAF5FF', color: '#7C3AED', border: '#DDD6FE', dot: '#8B5CF6' },
  shipped:    { bg: '#ECFEFF', color: '#0891B2', border: '#A5F3FC', dot: '#06B6D4' },
  delivered:  { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', dot: '#22C55E' },
  cancelled:  { bg: '#FFF5F6', color: '#E31837', border: '#FECDD3', dot: '#E31837' },
}
const PRIORITY: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Critical', color: '#E31837', bg: '#FFF5F6' },
  2: { label: 'High',     color: '#D97706', bg: '#FFFBEB' },
  3: { label: 'Normal',   color: '#6B7280', bg: '#F9FAFB' },
  4: { label: 'Low',      color: '#9CA3AF', bg: '#F9FAFB' },
}
const ALL_STATUSES = ['', 'pending', 'processing', 'picking', 'packed', 'shipped', 'delivered', 'cancelled']

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const qc = useQueryClient()
  const limit = 50

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['orders', statusFilter, page],
    queryFn: () => {
      const p = new URLSearchParams({ skip: String(page * limit), limit: String(limit) })
      if (statusFilter) p.set('status', statusFilter)
      return api.get(`/orders/?${p}`).then(r => r.data)
    },
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })

  const filtered = orders?.filter((o: any) =>
    !search || o.order_number?.toLowerCase().includes(search.toLowerCase()) || o.customer_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-in">

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="section-title">Order Management</h1>
          <p className="section-subtitle">Track, process and fulfil customer orders</p>
        </div>
        <button onClick={() => refetch()} className="btn-primary" style={{ fontSize: 12 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {ALL_STATUSES.map(s => {
          const st = STATUS_STYLE[s]
          const active = statusFilter === s
          return (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(0) }} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
              background: active ? '#E31837' : 'white',
              color: active ? 'white' : '#6B7280',
              border: `1.5px solid ${active ? '#E31837' : '#E5E7EB'}`,
              boxShadow: active ? '0 2px 8px rgba(227,24,55,0.25)' : 'none',
            }}>
              {s && st && <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? 'rgba(255,255,255,0.7)' : st.dot }} />}
              {s || 'All'}
            </button>
          )
        })}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..."
            style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px 7px 30px', fontSize: 12, color: '#111827', width: 200, outline: 'none', fontFamily: 'inherit' }} />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'white', border: '1px solid #EBEBEB', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr className="table-header">
                {['Order #', 'Customer', 'Status', 'Priority', 'Value', 'Items', 'Created', 'Action'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: h === 'Value' || h === 'Items' ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, border: '2px solid #E31837', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Loading orders...
                  </div>
                </td></tr>
              ) : filtered?.map((order: any) => {
                const st = STATUS_STYLE[order.status] || STATUS_STYLE.pending
                const pr = PRIORITY[order.priority] || PRIORITY[3]
                return (
                  <tr key={order.id} className="table-row">
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#E31837' }}>{order.order_number}</span>
                    </td>
                    <td style={{ padding: '11px 16px', fontWeight: 500, color: '#374151', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.customer_name}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: st.bg, color: st.color, border: `1px solid ${st.border}`, borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: st.dot }} />
                        {order.status}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ background: pr.bg, color: pr.color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{pr.label}</span>
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                      ${order.total_value?.toLocaleString()}
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', color: '#6B7280', fontWeight: 500 }}>{order.items?.length ?? 0}</td>
                    <td style={{ padding: '11px 16px', color: '#9CA3AF', fontSize: 11 }}>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '11px 16px' }}>
                      {order.status === 'pending' && (
                        <button onClick={() => updateStatus.mutate({ id: order.id, status: 'processing' })}
                          style={{ fontSize: 11, fontWeight: 600, color: '#E31837', background: '#FFF5F6', border: '1px solid #FECDD3', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>
                          Process →
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAFA' }}>
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="btn-ghost" style={{ fontSize: 12, opacity: page === 0 ? 0.4 : 1 }}>← Previous</button>
          <span style={{ fontSize: 12, color: '#6B7280' }}>Page {page + 1} · {filtered?.length ?? 0} records</span>
          <button onClick={() => setPage(page + 1)} disabled={!orders || orders.length < limit} className="btn-ghost" style={{ fontSize: 12, opacity: (!orders || orders.length < limit) ? 0.4 : 1 }}>Next →</button>
        </div>
      </div>
    </div>
  )
}
