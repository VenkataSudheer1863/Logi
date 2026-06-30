import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Props {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'red' | 'green' | 'amber' | 'blue' | 'purple' | 'indigo'
}

const palette = {
  red:    { bg: '#FFF5F6', icon: '#E31837', border: '#FECDD3', text: '#E31837' },
  green:  { bg: '#F0FDF4', icon: '#16A34A', border: '#BBF7D0', text: '#16A34A' },
  amber:  { bg: '#FFFBEB', icon: '#D97706', border: '#FDE68A', text: '#D97706' },
  blue:   { bg: '#EFF6FF', icon: '#2563EB', border: '#BFDBFE', text: '#2563EB' },
  purple: { bg: '#FAF5FF', icon: '#7C3AED', border: '#DDD6FE', text: '#7C3AED' },
  indigo: { bg: '#EEF2FF', icon: '#4F46E5', border: '#C7D2FE', text: '#4F46E5' },
}

export default function KPICard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'red' }: Props) {
  const c = palette[color]
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? '#16A34A' : trend === 'down' ? '#E31837' : '#9CA3AF'

  return (
    <div style={{
      background: 'white',
      border: '1px solid #EBEBEB',
      borderRadius: 16,
      padding: '18px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      transition: 'all 0.2s ease',
      cursor: 'default',
      position: 'relative',
      overflow: 'hidden',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 24px rgba(227,24,55,0.10), 0 1px 4px rgba(0,0,0,0.06)`
      ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
      ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
    }}
    >
      {/* Subtle top accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.text, borderRadius: '16px 16px 0 0', opacity: 0.7 }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            {title}
          </p>
          <p style={{ fontSize: 28, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {value}
          </p>
          {subtitle && (
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, fontWeight: 500 }}>{subtitle}</p>
          )}
          {trend && trendValue && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
              <TrendIcon size={12} color={trendColor} />
              <span style={{ fontSize: 11, fontWeight: 600, color: trendColor }}>{trendValue}</span>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>vs last week</span>
            </div>
          )}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: c.bg, border: `1px solid ${c.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginLeft: 12,
        }}>
          <Icon size={20} color={c.icon} />
        </div>
      </div>
    </div>
  )
}
