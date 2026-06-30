import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useWMSStore } from '../store/wmsStore'
import {
  LayoutDashboard, Package, ShoppingCart, Warehouse, Ship,
  AlertTriangle, Brain, BarChart3, LogOut, Bell, X,
  ChevronRight, HelpCircle, Radio, RefreshCw
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import LogiFlowLogo from './LogiFlowLogo'
import { wsManager } from '../lib/wsManager'
import type { Status } from '../lib/wsManager'

const NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard',         desc: 'KPIs & overview' },
  { to: '/inventory',   icon: Package,         label: 'Inventory',         desc: 'Stock & bins' },
  { to: '/orders',      icon: ShoppingCart,    label: 'Orders',            desc: 'Fulfilment' },
  { to: '/warehouse',   icon: Warehouse,       label: 'Warehouse Map',     desc: 'Zones & layout' },
  { to: '/inbound',     icon: Ship,            label: 'Inbound Logistics', desc: 'Containers' },
  { to: '/incidents',   icon: AlertTriangle,   label: 'Incidents',         desc: 'Safety & alerts' },
  { to: '/ai-insights', icon: Brain,           label: 'AI Insights',       desc: 'Agent intelligence' },
  { to: '/analytics',   icon: BarChart3,       label: 'Analytics',         desc: 'Reports & trends' },
]

function BrandMark() {
  return <LogiFlowLogo size={36} />
}

// Status config for each WS state
const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; border: string; dot: string; pulse: boolean }> = {
  connected:    { label: 'Live · Connected',  color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', dot: '#22C55E', pulse: true  },
  connecting:   { label: 'Connecting...',     color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', dot: '#F59E0B', pulse: true  },
  reconnecting: { label: 'Reconnecting...',   color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', dot: '#F59E0B', pulse: true  },
  disconnected: { label: 'Disconnected',      color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', dot: '#9CA3AF', pulse: false },
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const { wsStatus, wsAttempt, wsConnected, setWsStatus, addNotification, notifications, clearNotification } = useWMSStore()
  const navigate = useNavigate()
  const location = useLocation()
  const notifiedConnected = useRef(false)

  const currentPage = NAV.find(n =>
    n.to === location.pathname || (n.to !== '/' && location.pathname.startsWith(n.to))
  )

  useEffect(() => {
    // Register status handler
    const offStatus = wsManager.onStatus((status, attempt) => {
      setWsStatus(status, attempt)
      if (status === 'connected' && !notifiedConnected.current) {
        notifiedConnected.current = true
        addNotification('Real-time feed connected', 'success')
      }
      if (status === 'reconnecting' && attempt === 1) {
        addNotification('Connection lost — reconnecting...', 'warning')
      }
    })

    // Register message handler
    const offMsg = wsManager.onMessage((data) => {
      if (data.type === 'new_order') {
        addNotification(data.message || 'New order placed', 'info')
      }
    })

    // Connect (idempotent — won't reconnect if already open)
    wsManager.connect('ws://localhost:8000/ws/general')

    return () => { offStatus(); offMsg() }
  }, [])

  const cfg = STATUS_CONFIG[wsStatus]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F7F7F8' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 240, background: 'white', borderRight: '1px solid #EBEBEB',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        boxShadow: '2px 0 16px rgba(0,0,0,0.04)',
      }}>

        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrandMark />
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                LogiFlow WMS
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#E31837', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 1 }}>
                AI-Native WMS
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px 8px' }}>
            Main Menu
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end={to === '/'}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 10, fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'white' : '#4B5563',
                  textDecoration: 'none',
                  background: isActive ? 'linear-gradient(135deg,#E31837,#C0152F)' : 'transparent',
                  boxShadow: isActive ? '0 3px 10px rgba(227,24,55,0.28)' : 'none',
                  transition: 'all 0.15s ease',
                })}
                className={({ isActive }) => isActive ? '' : 'nav-hover-item'}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Sidebar footer */}
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '10px 10px 12px' }}>

          {/* ── Live status pill ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', borderRadius: 10, marginBottom: 8,
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            transition: 'all 0.3s ease',
          }}>
            {/* Animated dot */}
            <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: cfg.dot,
                position: 'absolute',
              }} />
              {cfg.pulse && (
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: cfg.dot, opacity: 0.4,
                  position: 'absolute',
                  animation: 'pulseRed 1.8s ease-out infinite',
                }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, lineHeight: 1 }}>
                {cfg.label}
              </div>
              {wsStatus === 'reconnecting' && (
                <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>
                  Attempt {wsAttempt}
                </div>
              )}
            </div>
            {/* Reconnect button when disconnected */}
            {wsStatus === 'disconnected' && (
              <button
                onClick={() => wsManager.connect('ws://localhost:8000/ws/general')}
                title="Reconnect"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}
              >
                <RefreshCw size={12} />
              </button>
            )}
            {wsStatus === 'connected' && (
              <Radio size={11} color={cfg.dot} />
            )}
          </div>

          {/* User row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg,#E31837,#C0152F)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 12, fontWeight: 700,
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
            <button onClick={() => { logout(); navigate('/login') }} title="Sign out"
              style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #E5E7EB', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9CA3AF', transition: 'all 0.15s', flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E31837'; (e.currentTarget as HTMLButtonElement).style.color = '#E31837' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF' }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <header style={{
          background: 'white', borderBottom: '1px solid #EBEBEB',
          padding: '0 24px', height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>LogiFlow</span>
            <ChevronRight size={12} color="#D1D5DB" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
              {currentPage?.label || 'Dashboard'}
            </span>
            {currentPage?.desc && (
              <span style={{ fontSize: 11, color: '#9CA3AF', background: '#F3F4F6', padding: '2px 8px', borderRadius: 99, marginLeft: 4, fontWeight: 500 }}>
                {currentPage.desc}
              </span>
            )}
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

            {/* ── Topbar WS status chip ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
              background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
              transition: 'all 0.3s ease', cursor: wsStatus === 'disconnected' ? 'pointer' : 'default',
            }}
              onClick={() => wsStatus === 'disconnected' && wsManager.connect('ws://localhost:8000/ws/general')}
            >
              {/* Dot */}
              <div style={{ position: 'relative', width: 8, height: 8, flexShrink: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, position: 'absolute' }} />
                {cfg.pulse && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, opacity: 0.35, position: 'absolute', animation: 'pulseRed 1.8s ease-out infinite' }} />
                )}
              </div>
              {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting' : wsStatus === 'reconnecting' ? `Retry ${wsAttempt}` : 'Offline'}
            </div>

            {/* Bell */}
            <div style={{ position: 'relative' }}>
              <button style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid #EBEBEB', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280' }}>
                <Bell size={15} />
                {notifications.length > 0 && (
                  <span style={{ position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderRadius: '50%', background: '#E31837', color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                    {notifications.length}
                  </span>
                )}
              </button>
            </div>

            <button style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid #EBEBEB', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280' }}>
              <HelpCircle size={15} />
            </button>
          </div>
        </header>

        {/* Toasts */}
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340 }}>
          {notifications.slice(-4).map((n) => (
            <div key={n.id} className="animate-fade-in" style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
              padding: '12px 14px', borderRadius: 12, fontSize: 13, fontWeight: 500,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              background: n.type === 'success' ? '#F0FDF4' : n.type === 'error' ? '#FFF5F6' : n.type === 'warning' ? '#FFFBEB' : 'white',
              border: `1px solid ${n.type === 'success' ? '#BBF7D0' : n.type === 'error' ? '#FECDD3' : n.type === 'warning' ? '#FDE68A' : '#EBEBEB'}`,
              color: n.type === 'success' ? '#15803D' : n.type === 'error' ? '#E31837' : n.type === 'warning' ? '#92400E' : '#374151',
            }}>
              <span>{n.message}</span>
              <button onClick={() => clearNotification(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, padding: 0, flexShrink: 0 }}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
