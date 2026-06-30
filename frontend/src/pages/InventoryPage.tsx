import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Package, AlertCircle, RefreshCw, Search, Filter } from 'lucide-react'
import api from '../lib/api'
import { useWMSStore } from '../store/wmsStore'

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  available:  { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  reserved:   { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  damaged:    { bg: '#FFF5F6', color: '#E31837', border: '#FECDD3' },
  in_transit: { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
}

export default function InventoryPage() {
  const warehouseId = useWMSStore((s) => s.selectedWarehouseId)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const limit = 50

  const { data: inventory, isLoading, refetch } = useQuery({
    queryKey: ['inventory', warehouseId, page],
    queryFn: () => api.get(`/inventory/?warehouse_id=${warehouseId}&skip=${page * limit}&limit=${limit}`).then(r => r.data),
  })
  const { data: lowStock } = useQuery({ queryKey: ['low-stock'], queryFn: () => api.get('/inventory/low-stock').then(r => r.data) })
  const { data: summary } = useQuery({
    queryKey: ['inv-summary', warehouseId],
    queryFn: () => api.get(`/inventory/summary/${warehouseId}`).then(r => r.data),
    enabled: !!warehouseId,
  })

  const filtered = inventory?.filter((inv: any) =>
    !search || String(inv.product_id).includes(search) || String(inv.bin_id).includes(search)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-in">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="section-title">Inventory Management</h1>
          <p className="section-subtitle">Stock levels, bin allocation and movement tracking</p>
        </div>
        <button onClick={() => refetch()} className="btn-primary" style={{ fontSize: 12 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Total Units',    value: summary.total_units?.toLocaleString(),     color: '#111827', accent: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' },
            { label: 'Available',      value: summary.available_units?.toLocaleString(), color: '#16A34A', accent: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
            { label: 'Reserved',       value: summary.reserved_units?.toLocaleString(),  color: '#D97706', accent: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
          ].map(({ label, value, color, accent, bg, border }) => (
            <div key={label} style={{
              background: 'white', border: '1px solid #EBEBEB', borderRadius: 16, padding: '20px 24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              borderLeft: `4px solid ${accent}`,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</p>
              <p style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: '-0.03em' }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Low stock alert */}
      {lowStock && lowStock.length > 0 && (
        <div style={{
          background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14,
          padding: '14px 18px', borderLeft: '4px solid #D97706',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertCircle size={15} color="#D97706" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>
              {lowStock.length} items below reorder point
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {lowStock.slice(0, 14).map((item: any) => (
              <span key={item.product_id} style={{
                background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 99,
                padding: '2px 10px', fontSize: 11, fontWeight: 600, color: '#92400E',
              }}>
                {item.sku}: {item.quantity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Table card */}
      <div style={{ background: 'white', border: '1px solid #EBEBEB', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {/* Table toolbar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAFA' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={15} color="#E31837" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Inventory Records</span>
            {inventory && <span style={{ fontSize: 11, color: '#9CA3AF', background: '#F3F4F6', padding: '2px 8px', borderRadius: 99 }}>{inventory.length} shown</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search product / bin..."
                style={{
                  background: 'white', border: '1px solid #E5E7EB', borderRadius: 8,
                  padding: '6px 10px 6px 30px', fontSize: 12, color: '#111827', width: 200,
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr className="table-header">
                {['ID', 'Product ID', 'Bin', 'Quantity', 'Reserved', 'Status', 'Last Updated'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Quantity' || h === 'Reserved' ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, border: '2px solid #E31837', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Loading inventory...
                  </div>
                </td></tr>
              ) : filtered?.map((inv: any) => {
                const s = STATUS_STYLE[inv.status] || { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' }
                return (
                  <tr key={inv.id} className="table-row">
                    <td style={{ padding: '10px 16px', color: '#9CA3AF', fontSize: 12 }}>{inv.id}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#374151' }}>{inv.product_id}</td>
                    <td style={{ padding: '10px 16px', color: '#6B7280', fontSize: 12 }}>{inv.bin_id ?? '—'}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>{inv.quantity.toLocaleString()}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#D97706' }}>{inv.reserved_quantity}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#9CA3AF', fontSize: 11 }}>
                      {new Date(inv.last_updated).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAFA' }}>
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="btn-ghost" style={{ fontSize: 12, opacity: page === 0 ? 0.4 : 1 }}>
            ← Previous
          </button>
          <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>Page {page + 1}</span>
          <button onClick={() => setPage(page + 1)} disabled={!inventory || inventory.length < limit} className="btn-ghost" style={{ fontSize: 12, opacity: (!inventory || inventory.length < limit) ? 0.4 : 1 }}>
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
