import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertTriangle, Plus, Loader, CheckCircle, X, ShieldAlert } from 'lucide-react'
import api from '../lib/api'

const SEV: Record<string, { bg: string; color: string; border: string; bar: string }> = {
  low:      { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB', bar: '#9CA3AF' },
  medium:   { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', bar: '#F59E0B' },
  high:     { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA', bar: '#F97316' },
  critical: { bg: '#FFF5F6', color: '#E31837', border: '#FECDD3', bar: '#E31837' },
}

import AIResponse from '../components/AIResponse'

export default function IncidentsPage() {
  const [showForm, setShowForm] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [form, setForm] = useState({ type: 'damage', severity: 'medium', location: '', description: '', warehouse_id: 1 })
  const qc = useQueryClient()

  const { data: incidents } = useQuery({ queryKey: ['incidents'], queryFn: () => api.get('/incidents/?is_resolved=false').then(r => r.data), refetchInterval: 15000 })

  const createIncident = useMutation({
    mutationFn: (d: any) => api.post('/incidents/', d),
    onSuccess: async (res) => {
      qc.invalidateQueries({ queryKey: ['incidents'] }); setShowForm(false); setAnalyzing(true)
      try { const { data } = await api.post('/ai/analyze-incident', { incident_id: res.data.id }); setAiAnalysis(data) }
      finally { setAnalyzing(false) }
    },
  })

  const resolveIncident = useMutation({
    mutationFn: (id: number) => api.patch(`/incidents/${id}/resolve`, { resolved_by: 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-in">

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="section-title">Incident Management</h1>
          <p className="section-subtitle">Report, track and resolve warehouse safety incidents</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ fontSize: 12 }}>
          <Plus size={13} /> Report Incident
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {(['critical','high','medium','low'] as const).map(sev => {
          const count = incidents?.filter((i: any) => i.severity === sev).length ?? 0
          const s = SEV[sev]
          return (
            <div key={sev} style={{ background: 'white', border: `1px solid ${s.border}`, borderRadius: 14, padding: '14px 18px', borderLeft: `4px solid ${s.bar}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{sev}</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{count}</p>
            </div>
          )
        })}
      </div>

      {/* Report form */}
      {showForm && (
        <div style={{ background: 'white', border: '1px solid #EBEBEB', borderRadius: 16, padding: 20, boxShadow: '0 4px 20px rgba(227,24,55,0.08)', borderLeft: '4px solid #E31837' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldAlert size={16} color="#E31837" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>New Incident Report</span>
            </div>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5 }}>Incident Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="select">
                {['damage','theft','fire','spill','equipment_failure','safety_violation','stock_discrepancy'].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5 }}>Severity</label>
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="select">
                {['low','medium','high','critical'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5 }}>Location</label>
            <input placeholder="e.g. Zone B, Bin 42" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5 }}>Description</label>
            <textarea placeholder="Describe the incident in detail..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
              style={{ width: '100%', background: '#FAFAFA', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: '#111827', fontFamily: 'inherit', resize: 'none', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => createIncident.mutate(form)} className="btn-primary">Submit & Analyse with AI</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {(analyzing || aiAnalysis) && (
        <div style={{ background: 'white', border: '1px solid #EBEBEB', borderRadius: 16, padding: 20, borderLeft: '4px solid #E31837', boxShadow: '0 4px 20px rgba(227,24,55,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 4, height: 16, background: '#E31837', borderRadius: 99 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>AI Incident Analysis</span>
            {analyzing && <Loader size={14} color="#E31837" style={{ animation: 'spin 0.7s linear infinite', marginLeft: 4 }} />}
          </div>
          {analyzing && <p style={{ fontSize: 13, color: '#6B7280' }}>Analysing incident with AI agents...</p>}
          {aiAnalysis && !analyzing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'Validated Severity', value: aiAnalysis.validated_severity?.toUpperCase(), color: SEV[aiAnalysis.validated_severity]?.color || '#111827' },
                  { label: 'Escalation', value: aiAnalysis.escalation_required ? 'REQUIRED' : 'Not needed', color: aiAnalysis.escalation_required ? '#E31837' : '#16A34A' },
                  { label: 'Est. Resolution', value: `${aiAnalysis.estimated_resolution_hours}h`, color: '#111827' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color }}>{value}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 12, padding: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Immediate Actions</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {aiAnalysis.immediate_actions?.map((a: string, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#FFF5F6', border: '1px solid #FECDD3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: '#E31837' }}>{i+1}</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{a}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: '#FFF5F6', border: '1px solid #FECDD3', borderRadius: 12, padding: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#E31837', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>AI Analysis</p>
                <AIResponse content={aiAnalysis.ai_analysis} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Incident list */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', marginBottom: 12 }}>Active Incidents ({incidents?.length ?? 0})</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {incidents?.map((inc: any) => {
            const s = SEV[inc.severity] || SEV.low
            return (
              <div key={inc.id} style={{ background: 'white', border: `1px solid ${s.border}`, borderRadius: 14, padding: '14px 18px', borderLeft: `4px solid ${s.bar}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertTriangle size={16} color={s.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', textTransform: 'capitalize' }}>{inc.type.replace('_',' ')}</span>
                      <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 99, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>{inc.severity}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>{inc.location}</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF' }}>{inc.description}</p>
                    <p style={{ fontSize: 10, color: '#D1D5DB', marginTop: 4 }}>{new Date(inc.detected_at).toLocaleString()}</p>
                  </div>
                </div>
                <button onClick={() => resolveIncident.mutate(inc.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', flexShrink: 0 }}>
                  <CheckCircle size={13} /> Resolve
                </button>
              </div>
            )
          })}
          {incidents?.length === 0 && (
            <div style={{ background: 'white', border: '1px solid #EBEBEB', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
              <CheckCircle size={32} color="#22C55E" style={{ margin: '0 auto 10px' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>No active incidents</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>All clear — warehouse operations running smoothly</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
