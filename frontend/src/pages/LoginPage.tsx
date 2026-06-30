import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Zap, Shield, BarChart3, Brain } from 'lucide-react'
import api from '../lib/api'
import LogiFlowLogo from '../components/LogiFlowLogo'
import { useAuthStore } from '../store/authStore'

const FEATURES = [
  { icon: Brain,    label: 'Agentic AI',         desc: 'LangGraph-powered autonomous decisions' },
  { icon: Zap,      label: 'Real-time Ops',       desc: 'Live WebSocket warehouse feed' },
  { icon: Shield,   label: 'Label Validation',    desc: 'OCR + LLM accuracy at 99%' },
  { icon: BarChart3,label: 'Predictive Analytics',desc: 'Demand forecasting & KPIs' },
]

function BrandLogo({ size = 44 }: { size?: number }) {
  return <LogiFlowLogo size={size} />
}

export default function LoginPage() {
  const [email, setEmail] = useState('admin@maersk.com')
  const [password, setPassword] = useState('admin123')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const form = new FormData()
      form.append('username', email); form.append('password', password)
      const { data } = await api.post('/auth/login', form)
      login(data.access_token, { id: data.user_id, name: data.name, role: data.role })
      navigate('/')
    } catch {
      setError('Invalid credentials. Try admin@maersk.com / admin123')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Left brand panel ── */}
      <div style={{
        width: '50%', minWidth: 480,
        background: 'linear-gradient(145deg, #E31837 0%, #8B0E20 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '40px 48px',
        position: 'relative', overflow: 'hidden',
      }} className="hidden lg:flex">
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', top: '40%', right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <BrandLogo size={44} />
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>LogiFlow WMS</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>AI-Native WMS</div>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.15)', borderRadius: 99,
            padding: '4px 12px', marginBottom: 20,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80' }} />
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: 600 }}>AI-Native Platform</span>
          </div>
          <h1 style={{ color: 'white', fontSize: 40, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 16 }}>
            Intelligent<br />Warehouse<br />Operations
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.7, maxWidth: 380 }}>
            End-to-end supply chain orchestration with autonomous AI agents, real-time inventory intelligence, and predictive logistics.
          </p>
        </div>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={16} color="white" />
              </div>
              <div>
                <div style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{label}</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right login panel ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#F7F7F8', padding: '40px 32px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Mobile logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }} className="lg:hidden">
            <BrandLogo size={36} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>LogiFlow WMS</div>
              <div style={{ fontSize: 10, color: '#E31837', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>AI-Native WMS</div>
            </div>
          </div>

          {/* Form card */}
          <div style={{
            background: 'white', borderRadius: 20, padding: '36px 32px',
            boxShadow: '0 4px 40px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
            border: '1px solid #EBEBEB',
          }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', marginBottom: 4 }}>
                Welcome back
              </h2>
              <p style={{ fontSize: 13, color: '#6B7280' }}>Sign in to your LogiFlow account</p>
            </div>

            {error && (
              <div style={{
                background: '#FFF5F6', border: '1px solid #FECDD3', borderRadius: 10,
                padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#E31837',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span>⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Email address
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input" placeholder="you@company.com" required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input" placeholder="••••••••" required
                    style={{ paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0,
                  }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 4, padding: '12px 18px', fontSize: 14 }}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    Signing in...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    Sign In <ArrowRight size={15} />
                  </span>
                )}
              </button>
            </form>

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #F3F4F6', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#9CA3AF' }}>
                AI-Native Logistics Intelligence
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
