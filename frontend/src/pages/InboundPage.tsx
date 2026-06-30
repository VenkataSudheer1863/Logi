import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Ship, Clock, Loader, Zap, Anchor, CheckCircle2 } from 'lucide-react'
import api from '../lib/api'

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  in_transit: { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', dot: '#3B82F6' },
  arrived:    { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', dot: '#22C55E' },
  unloading:  { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', dot: '#F59E0B' },
  cleared:    { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB', dot: '#9CA3AF' },
}

import AIResponse from '../components/AIResponse'

export default function InboundPage() {
  const [planResult, setPlanResult] = useState<any>(null)
  const [planning, setPlanning] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const { data: containers } = useQuery({ queryKey: ['containers'], queryFn: () => api.get('/inbound/containers').then(r => r.data) })

  const runPlan = async (c: any) => {
    setPlanning(true); setSelectedId(c.id); setPlanResult(null)
    try {
      const { data } = await api.post('/ai/inbound-plan', {
        container_no: c.container_no, origin_port: c.origin_port, destination_port: c.destination_port,
        eta: c.eta, cargo_weight: c.cargo_weight,
        available_docks: ['DOCK-A','DOCK-B','DOCK-C','DOCK-D'], available_trucks: 6, warehouse_capacity_pct: 72,
      })
      setPlanResult(data)
    } finally { setPlanning(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-in">

      <div>
        <h1 className="section-title">Inbound Logistics</h1>
        <p className="section-subtitle">Container tracking and AI-powered arrival planning</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {(['in_transit','arrived','unloading','cleared'] as const).map(s => {
          const count = containers?.filter((c: any) => c.status === s).length ?? 0
          const st = STATUS_STYLE[s]
          return (
            <div key={s} style={{ background: 'white', border: `1px solid ${st.border}`, borderRadius: 14, padding: '14px 18px', borderTop: `3px solid ${st.dot}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{s.replace('_',' ')}</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: st.color }}>{count}</p>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Container list */}
        <div style={{ background: 'white', border: '1px solid #EBEBEB', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8, background: '#FAFAFA' }}>
            <Ship size={15} color="#E31837" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Containers</span>
            {containers && <span style={{ fontSize: 11, color: '#9CA3AF', background: '#F3F4F6', padding: '2px 8px', borderRadius: 99 }}>{containers.length} total</span>}
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 500 }}>
            {containers?.map((c: any) => {
              const st = STATUS_STYLE[c.status] || STATUS_STYLE.cleared
              const isSelected = selectedId === c.id
              return (
                <div key={c.id} style={{
                  padding: '12px 18px', borderBottom: '1px solid #F3F4F6',
                  background: isSelected ? '#FFF5F6' : 'white',
                  transition: 'background 0.15s',
                  cursor: 'default',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#E31837' }}>{c.container_no}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: st.bg, color: st.color, border: `1px solid ${st.border}`, borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: st.dot }} />
                      {c.status}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>{c.origin_port} → {c.destination_port}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9CA3AF' }}>
                      <Clock size={10} /> ETA: {new Date(c.eta).toLocaleDateString()}
                    </div>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{c.cargo_weight?.toLocaleString()} kg</span>
                  </div>
                  {c.status === 'in_transit' && (
                    <button onClick={() => runPlan(c)} style={{
                      marginTop: 8, display: 'flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 600, color: '#E31837',
                      background: '#FFF5F6', border: '1px solid #FECDD3', borderRadius: 7,
                      padding: '4px 10px', cursor: 'pointer',
                    }}>
                      <Zap size={11} /> Generate AI Plan
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* AI Plan */}
        <div style={{ background: 'white', border: '1px solid #EBEBEB', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <div style={{ width: 4, height: 16, background: '#E31837', borderRadius: 99 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>AI Inbound Operations Plan</span>
            {planning && <Loader size={14} color="#E31837" style={{ animation: 'spin 0.7s linear infinite', marginLeft: 'auto' }} />}
          </div>

          {!planResult && !planning && (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <Anchor size={36} color="#E5E7EB" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 500 }}>Select a container and click "Generate AI Plan"</p>
            </div>
          )}

          {planning && (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ width: 40, height: 40, border: '3px solid #FECDD3', borderTopColor: '#E31837', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>AI agents analysing container arrival...</p>
            </div>
          )}

          {planResult && !planning && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'linear-gradient(135deg,#E31837,#C0152F)', borderRadius: 12, padding: '14px 16px', textAlign: 'center', color: 'white' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Dock Assignment</p>
                  <p style={{ fontSize: 24, fontWeight: 900 }}>{planResult.dock_assignment}</p>
                </div>
                <div style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Labour Required</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: '#111827' }}>{planResult.labor_count}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF' }}>workers</p>
                </div>
              </div>

              {planResult.risk_flags?.length > 0 && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 8 }}>⚠ Risk Flags</p>
                  {planResult.risk_flags.map((f: string, i: number) => (
                    <p key={i} style={{ fontSize: 12, color: '#92400E', marginBottom: 3 }}>• {f}</p>
                  ))}
                </div>
              )}

              <div style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 12, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Truck Schedule ({planResult.truck_schedule?.length})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {planResult.truck_schedule?.map((t: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', border: '1px solid #EBEBEB', borderRadius: 8, padding: '7px 12px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Truck {t.truck_slot}</span>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>{t.estimated_load_kg?.toFixed(0)} kg</span>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>+{t.departure_offset_hours}h</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#FFF5F6', border: '1px solid #FECDD3', borderRadius: 12, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#E31837', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>AI Operations Plan</p>
                <AIResponse content={planResult.ai_plan} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
