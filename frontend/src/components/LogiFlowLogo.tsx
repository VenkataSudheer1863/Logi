/**
 * LogiFlow WMS — shared logo mark component.
 * Used in sidebar, login page, and anywhere the brand mark is needed.
 */

interface Props {
  size?: number
}

export default function LogiFlowLogo({ size = 36 }: Props) {
  const id = `lg-${size}` // unique gradient IDs per size
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E31837"/>
          <stop offset="100%" stopColor="#8B0E20"/>
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.20)"/>
          <stop offset="60%" stopColor="rgba(255,255,255,0)"/>
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="48" height="48" rx="12" fill={`url(#${id}-bg)`}/>
      {/* Top shine */}
      <rect width="48" height="26" rx="12" fill={`url(#${id}-shine)`}/>

      {/* "LF" lettermark */}
      {/* Shared vertical stem */}
      <rect x="9"  y="11" width="7.5" height="26" rx="2" fill="white"/>
      {/* L foot */}
      <rect x="9"  y="30" width="16"  height="7"  rx="2" fill="white"/>
      {/* F top bar */}
      <rect x="22" y="11" width="17"  height="7"  rx="2" fill="white"/>
      {/* F mid bar */}
      <rect x="22" y="21" width="12"  height="6"  rx="2" fill="white"/>

      {/* AI spark — small glowing dot top-right */}
      <circle cx="40" cy="10" r="5" fill="white" opacity="0.18"/>
      <circle cx="40" cy="10" r="2.8" fill="white"/>
    </svg>
  )
}
