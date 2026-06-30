import { useState, useRef, useEffect } from 'react'
import { Brain, Send, Loader, Zap, TrendingUp, AlertTriangle, Bot, User, Warehouse } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import AIResponse from '../components/AIResponse'

interface Message { role: 'user' | 'ai'; content: string; ts?: number }

const AgentCard = ({ title, icon: Icon, iconColor, children }: { title: string; icon: any; iconColor: string; children: React.ReactNode }) => (
  <div style={{ background: 'white', border: '1px solid #EBEBEB', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
    <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8, background: '#FAFAFA' }}>
      <div style={{ width: 4, height: 16, background: '#E31837', borderRadius: 99 }} />
      <Icon size={14} color={iconColor} />
      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{title}</span>
      <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9CA3AF', background: '#F3F4F6', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>AI Agent</span>
    </div>
    <div style={{ padding: 18 }}>{children}</div>
  </div>
)

export default function AIInsightsPage() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'ai', content: "Hello! I'm the LogiFlow WMS AI assistant. I can help with inventory optimisation, disruption analysis, label validation, and operational insights. What would you like to know?", ts: Date.now()
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [disruptionForm, setDisruptionForm] = useState({ disruption_type: 'weather', affected_port: 'DEHAM', affected_containers: 'MSCU1234567,MSCU7654321', severity_score: 7, estimated_delay_hours: 48 })
  const [disruptionResult, setDisruptionResult] = useState<any>(null)
  const [disruptionLoading, setDisruptionLoading] = useState(false)

  const [slottingResult, setSlottingResult] = useState<any>(null)
  const [slottingLoading, setSlottingLoading] = useState(false)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(1)

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/warehouses/').then(r => r.data),
  })

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return
    const userMsg = input.trim(); setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg, ts: Date.now() }])
    setLoading(true)
    try {
      const { data } = await api.post('/ai/chat', { message: userMsg })
      setMessages(prev => [...prev, { role: 'ai', content: data.response, ts: Date.now() }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: 'AI service temporarily unavailable. Please check your Azure OpenAI configuration.', ts: Date.now() }])
    } finally { setLoading(false) }
  }

  const runDisruption = async () => {
    setDisruptionLoading(true)
    try {
      const { data } = await api.post('/ai/disruption-analysis', { ...disruptionForm, affected_containers: disruptionForm.affected_containers.split(',').map(s => s.trim()) })
      setDisruptionResult(data)
    } finally { setDisruptionLoading(false) }
  }

  const runSlotting = async () => {
    setSlottingLoading(true)
    setSlottingResult(null)
    try {
      const { data } = await api.post('/ai/optimize-slotting', { warehouse_id: selectedWarehouseId })
      setSlottingResult(data)
    } finally { setSlottingLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-in">

      <div>
        <h1 className="section-title">AI Insights Panel</h1>
        <p className="section-subtitle">Agentic AI powered by LangGraph + Azure OpenAI GPT-4o</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* ── Chat ── */}
        <AgentCard title="WMS AI Assistant" icon={Brain} iconColor="#7C3AED">
          <div style={{ display: 'flex', flexDirection: 'column', height: 420 }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4, marginBottom: 14 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.role === 'ai' && (
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#E31837,#C0152F)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      <Bot size={14} color="white" />
                    </div>
                  )}
                  <div style={{
                    maxWidth: '75%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    fontSize: 13, lineHeight: 1.6, fontWeight: 400,
                    background: msg.role === 'user' ? 'linear-gradient(135deg,#E31837,#C0152F)' : '#F9FAFB',
                    color: msg.role === 'user' ? 'white' : '#374151',
                    border: msg.role === 'ai' ? '1px solid #F3F4F6' : 'none',
                    boxShadow: msg.role === 'user' ? '0 2px 8px rgba(227,24,55,0.25)' : 'none',
                  }}>
                    {msg.role === 'ai'
                      ? <AIResponse content={msg.content} compact />
                      : msg.content
                    }
                  </div>
                  {msg.role === 'user' && (
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      <User size={14} color="#6B7280" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#E31837,#C0152F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bot size={14} color="white" />
                  </div>
                  <div style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: '14px 14px 14px 4px', padding: '12px 16px', display: 'flex', gap: 4 }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#E31837', animation: `bounce 1.2s ${i*0.2}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            {/* Quick question chips — shown only when chat is empty */}
            {messages.length <= 1 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Suggested questions
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    'We have 2,944 SKUs below reorder point. What is the prioritisation strategy?',
                    'How do I reduce order picking errors to below 0.1%?',
                    'A container from Shanghai is delayed 48h. What steps should I take?',
                    'Our label accuracy is 87%. How do I improve it?',
                    'Explain wave picking vs batch picking for a high-volume port warehouse.',
                    'How do I calculate the cost impact of a 72-hour port delay?',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => { setInput(q) }}
                      style={{
                        background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8,
                        padding: '5px 10px', fontSize: 11, color: '#374151', cursor: 'pointer',
                        textAlign: 'left', lineHeight: 1.4, transition: 'all 0.15s',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E31837'; (e.currentTarget as HTMLButtonElement).style.color = '#E31837'; (e.currentTarget as HTMLButtonElement).style.background = '#FFF5F6' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLButtonElement).style.color = '#374151'; (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB' }}
                    >
                      {q.length > 55 ? q.slice(0, 55) + '…' : q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Ask about inventory, orders, disruptions..." className="input" style={{ flex: 1 }} />
              <button onClick={sendMessage} disabled={loading} className="btn-primary" style={{ padding: '9px 14px', flexShrink: 0 }}>
                <Send size={14} />
              </button>
            </div>
          </div>
        </AgentCard>

        {/* ── Disruption ── */}
        <AgentCard title="Disruption Analysis Agent" icon={AlertTriangle} iconColor="#D97706">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Type', key: 'disruption_type', type: 'select', options: ['weather','port_delay','strike','equipment_failure'] },
                { label: 'Affected Port', key: 'affected_port', type: 'text' },
                { label: 'Severity (0–10)', key: 'severity_score', type: 'number' },
                { label: 'Delay (hours)', key: 'estimated_delay_hours', type: 'number' },
              ].map(({ label, key, type, options }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5 }}>{label}</label>
                  {type === 'select' ? (
                    <select value={(disruptionForm as any)[key]} onChange={e => setDisruptionForm({ ...disruptionForm, [key]: e.target.value })} className="select">
                      {options!.map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}
                    </select>
                  ) : (
                    <input type={type} value={(disruptionForm as any)[key]} onChange={e => setDisruptionForm({ ...disruptionForm, [key]: type === 'number' ? Number(e.target.value) : e.target.value })} className="input" />
                  )}
                </div>
              ))}
            </div>
            <button onClick={runDisruption} disabled={disruptionLoading} className="btn-primary" style={{ width: '100%' }}>
              {disruptionLoading ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Analysing...</> : <><Zap size={13} /> Run Disruption Analysis</>}
            </button>
            {disruptionResult && (
              <div style={{ background: '#FAFAFA', border: '1px solid #EBEBEB', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: '#FFF5F6', border: '1px solid #FECDD3', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase' }}>Cost Impact</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: '#E31837' }}>${disruptionResult.cost_impact_usd?.toLocaleString()}</p>
                  </div>
                  <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase' }}>Containers</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{disruptionResult.containers_affected}</p>
                  </div>
                </div>
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, color: '#92400E' }}>
                  {disruptionResult.rerouting_plan}
                </div>
                <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                  <AIResponse content={disruptionResult.ai_recommendation?.slice(0, 400)} compact />
                </p>
              </div>
            )}
          </div>
        </AgentCard>
      </div>

      {/* ── Inventory Optimisation ── */}
      <AgentCard title="Inventory Optimisation Agent" icon={TrendingUp} iconColor="#16A34A">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          {/* Warehouse selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Warehouse size={14} color="#6B7280" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Warehouse:</span>
            </div>
            <select
              value={selectedWarehouseId}
              onChange={e => { setSelectedWarehouseId(Number(e.target.value)); setSlottingResult(null) }}
              style={{
                background: 'white', border: '1.5px solid #E5E7EB', borderRadius: 8,
                padding: '6px 10px', fontSize: 12, color: '#111827',
                fontFamily: 'inherit', cursor: 'pointer', minWidth: 220,
                outline: 'none',
              }}
            >
              {warehouses?.map((wh: any) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} — {wh.country}
                </option>
              ))}
            </select>
          </div>
          <button onClick={runSlotting} disabled={slottingLoading} className="btn-primary" style={{ flexShrink: 0 }}>
            {slottingLoading
              ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Optimising...</>
              : <><Zap size={13} /> Optimise Slotting</>}
          </button>
        </div>

        {/* Selected warehouse info */}
        {!slottingResult && !slottingLoading && (
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
            Run AI-powered slotting optimisation and replenishment analysis for{' '}
            <span style={{ fontWeight: 600, color: '#374151' }}>
              {warehouses?.find((w: any) => w.id === selectedWarehouseId)?.name ?? `Warehouse ${selectedWarehouseId}`}
            </span>.
          </p>
        )}
        {slottingResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Result header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10 }}>
              <Warehouse size={13} color="#16A34A" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#15803D' }}>
                {warehouses?.find((w: any) => w.id === selectedWarehouseId)?.name ?? `Warehouse ${selectedWarehouseId}`}
              </span>
              <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 4 }}>
                — {warehouses?.find((w: any) => w.id === selectedWarehouseId)?.location}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                Replenishment Orders <span style={{ background: '#FFF5F6', color: '#E31837', border: '1px solid #FECDD3', borderRadius: 99, padding: '1px 8px', fontSize: 11 }}>{slottingResult.replenishment_orders?.length}</span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                {slottingResult.replenishment_orders?.slice(0, 12).map((r: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA', border: '1px solid #F3F4F6', borderRadius: 8, padding: '7px 12px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#374151' }}>{r.sku}</span>
                    <span style={{ fontSize: 11, color: '#D97706', fontWeight: 600 }}>{r.current_qty} → +{r.suggested_order_qty}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: r.urgency === 'critical' ? '#E31837' : '#9CA3AF', background: r.urgency === 'critical' ? '#FFF5F6' : '#F9FAFB', padding: '1px 7px', borderRadius: 99 }}>{r.urgency}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>AI Insights</p>
              <div style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 10, padding: 14, maxHeight: 200, overflowY: 'auto' }}>
                <AIResponse content={slottingResult.ai_insights} compact />
              </div>
            </div>
          </div>
          </div>
        )}
        {!slottingResult && !slottingLoading && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#9CA3AF', fontSize: 13 }}>
            Select a warehouse above and click "Optimise Slotting"
          </div>
        )}
      </AgentCard>
    </div>
  )
}
