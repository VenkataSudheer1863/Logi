import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Warehouse, Package, Ship, Activity, Globe } from 'lucide-react'
import api from '../lib/api'
import { getSeaRoute, type LatLng } from '../lib/seaRoutes'

const WH_COORDS: Record<string, LatLng> = {
  'Hamburg Gateway':           [53.5753,  9.9954],
  'Singapore Hub':             [ 1.2644,103.8222],
  'Shanghai Logistics Center': [31.2304,121.4737],
  'Los Angeles Port':          [33.7395,-118.262],
  'Rotterdam Distribution':    [51.9225,  4.4792],
  'Dubai Logistics Hub':       [25.2048, 55.2708],
  'Yokohama Terminal':         [35.4437,139.6380],
  'Busan Container Port':      [35.1796,129.0756],
  'Antwerp Gateway':           [51.2194,  4.4025],
  'Felixstowe UK Hub':         [51.9600,  1.3500],
}

const PORT_TO_WH: Record<string, string> = {
  DEHAM: 'Hamburg Gateway',           SGSIN: 'Singapore Hub',
  CNSHA: 'Shanghai Logistics Center', USLAX: 'Los Angeles Port',
  NLRTM: 'Rotterdam Distribution',    AEDXB: 'Dubai Logistics Hub',
  JPYOK: 'Yokohama Terminal',         KRPUS: 'Busan Container Port',
  BEANR: 'Antwerp Gateway',           GBFXT: 'Felixstowe UK Hub',
}

const SHIPPING_LANES = [
  ['Hamburg Gateway',        'Rotterdam Distribution'],
  ['Hamburg Gateway',        'Antwerp Gateway'],
  ['Rotterdam Distribution', 'Felixstowe UK Hub'],
  ['Rotterdam Distribution', 'Singapore Hub'],
  ['Singapore Hub',          'Shanghai Logistics Center'],
  ['Singapore Hub',          'Dubai Logistics Hub'],
  ['Singapore Hub',          'Busan Container Port'],
  ['Shanghai Logistics Center', 'Los Angeles Port'],
  ['Shanghai Logistics Center', 'Yokohama Terminal'],
  ['Busan Container Port',   'Yokohama Terminal'],
  ['Los Angeles Port',       'Hamburg Gateway'],
  ['Dubai Logistics Hub',    'Hamburg Gateway'],
  ['Antwerp Gateway',        'Rotterdam Distribution'],
]

// Animated vessel dot following a sea route
function AnimatedShipment({ routePoints, delay = 0 }: { routePoints: LatLng[]; delay?: number }) {
  const [pos, setPos] = useState<LatLng>(routePoints[0] || [0, 0])
  const progressRef = useRef(delay % 1)
  const rafRef = useRef<number>()

  useEffect(() => {
    if (!routePoints.length) return
    const speed = 0.00022 + Math.random() * 0.00012
    const animate = () => {
      progressRef.current += speed
      if (progressRef.current > 1) progressRef.current = 0
      const idx = Math.min(Math.floor(progressRef.current * routePoints.length), routePoints.length - 1)
      setPos(routePoints[idx])
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [routePoints])

  return <CircleMarker center={pos} radius={4} pathOptions={{ color: 'white', fillColor: '#E31837', fillOpacity: 1, weight: 1.5 }} />
}

function MapContent({ warehouses, selectedWH, onSelectWH }: any) {
  return (
    <>
      {/* Light English-only tiles */}
      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png" attribution="" />
      <TileLayer url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png" attribution="" />

      {/* Hub markers only */}
      {warehouses?.map((wh: any) => {
        const coords = WH_COORDS[wh.name]
        if (!coords) return null
        const sel = selectedWH?.id === wh.id
        return (
          <CircleMarker key={wh.id} center={coords} radius={sel ? 13 : 9}
            pathOptions={{ color: '#E31837', fillColor: sel ? '#E31837' : '#fff', fillOpacity: 1, weight: sel ? 0 : 2.5 }}
            eventHandlers={{ click: () => onSelectWH(wh) }}>
            <Popup>
              <div style={{ fontFamily: 'Inter,sans-serif', minWidth: 170 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 4 }}>{wh.name}</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>{wh.location}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Capacity: {wh.capacity?.toLocaleString()} m³</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>🚢 Sea freight hub</div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}

export default function WarehousePage() {
  const [selectedWH, setSelectedWH] = useState<any>(null)
  const [liveEvents, setLiveEvents] = useState<string[]>([])

  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: () => api.get('/warehouses/').then(r => r.data) })
  const { data: zones } = useQuery({ queryKey: ['zones', selectedWH?.id], queryFn: () => api.get(`/warehouses/${selectedWH.id}/zones`).then(r => r.data), enabled: !!selectedWH })
  const { data: containers } = useQuery({ queryKey: ['containers'], queryFn: () => api.get('/inbound/containers').then(r => r.data), refetchInterval: 15000 })
  const { data: summary } = useQuery({ queryKey: ['inv-summary', selectedWH?.id], queryFn: () => api.get(`/inventory/summary/${selectedWH.id}`).then(r => r.data), enabled: !!selectedWH })

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/general')
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data)
        if (d.type === 'new_order') {
          const msg = `${new Date().toLocaleTimeString()} — ${d.data?.order_number} · ${d.data?.customer} · $${d.data?.total_value?.toLocaleString()}`
          setLiveEvents(prev => [msg, ...prev].slice(0, 12))
        }
      } catch { /* ignore */ }
    }
    return () => ws.close()
  }, [])

  const inTransit = containers?.filter((c: any) => c.status === 'in_transit').length ?? 0
  const arrived   = containers?.filter((c: any) => c.status === 'arrived').length ?? 0
  const cleared   = containers?.filter((c: any) => c.status === 'cleared').length ?? 0

  const ZONE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    receiving: { bg: '#F0FDF4', border: '#22C55E', text: '#15803D' },
    storage:   { bg: '#EEF2FF', border: '#6366F1', text: '#4338CA' },
    picking:   { bg: '#FFFBEB', border: '#F59E0B', text: '#B45309' },
    dispatch:  { bg: '#FFF5F6', border: '#E31837', text: '#B01229' },
    returns:   { bg: '#F9FAFB', border: '#9CA3AF', text: '#4B5563' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="section-title">Global Warehouse Network</h1>
          <p className="section-subtitle">Live sea container movements across 10 global port facilities</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'In Transit', value: inTransit, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
            { label: 'Arrived',    value: arrived,   color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
            { label: 'Cleared',    value: cleared,   color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
              <p style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.2 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* World map */}
      <div style={{ background: '#EFF6FF', borderRadius: 16, overflow: 'hidden', border: '1px solid #EBEBEB', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', position: 'relative' }}>

        {/* Legend */}
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, background: 'rgba(255,255,255,0.96)', border: '1px solid #E5E7EB', borderRadius: 12, padding: '12px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.10)', minWidth: 175 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Legend</p>
          {[
            { swatch: <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'white', border: '2.5px solid #E31837' }} />, label: 'Warehouse hub' },
            { swatch: <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E31837' }} />, label: 'Selected hub' },
          ].map(({ swatch, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
              <div style={{ width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{swatch}</div>
              <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>{label}</span>
            </div>
          ))}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F3F4F6' }}>
            <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Scroll to zoom · Drag to pan</p>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 1000, background: 'rgba(255,255,255,0.96)', border: '1px solid #E5E7EB', borderRadius: 10, padding: '8px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', gap: 18 }}>
          {[
            { label: 'Hubs', value: Object.keys(WH_COORDS).length, color: '#E31837' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            </div>
          ))}
        </div>

        <MapContainer center={[25, 20]} zoom={2} minZoom={2} maxZoom={8}
          style={{ height: 580, width: '100%' }}
          zoomControl scrollWheelZoom dragging attributionControl={false} worldCopyJump>
          <MapContent warehouses={warehouses} selectedWH={selectedWH} onSelectWH={setSelectedWH} />
        </MapContainer>
      </div>

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Warehouse detail */}
        <div style={{ background: 'white', border: '1px solid #EBEBEB', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 4, height: 16, background: '#E31837', borderRadius: 99 }} />
            <Warehouse size={14} color="#E31837" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{selectedWH ? selectedWH.name : 'Select a warehouse on the map'}</span>
          </div>
          {!selectedWH ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <Globe size={36} color="#E5E7EB" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13, color: '#9CA3AF' }}>Click any hub marker on the map</p>
            </div>
          ) : (
            <div style={{ padding: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Total',     value: summary?.total_units?.toLocaleString() ?? '—',     color: '#6366F1' },
                  { label: 'Available', value: summary?.available_units?.toLocaleString() ?? '—', color: '#16A34A' },
                  { label: 'Reserved',  value: summary?.reserved_units?.toLocaleString() ?? '—',  color: '#D97706' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color }}>{value}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 14 }}>
                {[
                  { label: 'Location',    value: selectedWH.location },
                  { label: 'Country',     value: selectedWH.country },
                  { label: 'Capacity',    value: `${selectedWH.capacity?.toLocaleString()} m³` },
                  { label: 'Coordinates', value: WH_COORDS[selectedWH.name]?.map((c: number) => c.toFixed(4)).join(', ') ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F9FAFB' }}>
                    <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
              {zones && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Zones ({zones.length})</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {zones.map((z: any) => {
                      const zc = ZONE_COLORS[z.type] || ZONE_COLORS.storage
                      return (
                        <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: zc.bg, border: `1px solid ${zc.border}`, borderRadius: 8, padding: '5px 10px' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: zc.border }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: zc.text }}>{z.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live order feed */}
        <div style={{ background: 'white', border: '1px solid #EBEBEB', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 4, height: 16, background: '#E31837', borderRadius: 99 }} />
            <Activity size={14} color="#E31837" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Live Order Feed</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 99, padding: '3px 10px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', animation: 'pulseRed 1.5s infinite' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#15803D' }}>LIVE</span>
            </div>
          </div>
          <div style={{ padding: '8px 0', maxHeight: 340, overflowY: 'auto' }}>
            {liveEvents.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <Ship size={28} color="#E5E7EB" style={{ margin: '0 auto 10px' }} />
                <p style={{ fontSize: 12, color: '#9CA3AF' }}>Waiting for live orders...</p>
                <p style={{ fontSize: 11, color: '#D1D5DB', marginTop: 4 }}>New orders appear every 30 seconds</p>
              </div>
            ) : liveEvents.map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 18px', borderBottom: '1px solid #F9FAFB', background: i === 0 ? '#FFF5F6' : 'white', transition: 'background 0.3s' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: i === 0 ? 'linear-gradient(135deg,#E31837,#C0152F)' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={13} color={i === 0 ? 'white' : '#9CA3AF'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: '#374151', fontWeight: i === 0 ? 600 : 400, lineHeight: 1.4 }}>{ev}</p>
                </div>
                {i === 0 && <span style={{ fontSize: 9, fontWeight: 700, color: '#E31837', background: '#FFF5F6', border: '1px solid #FECDD3', borderRadius: 99, padding: '1px 6px', flexShrink: 0 }}>NEW</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Facility grid */}
      <div style={{ background: 'white', border: '1px solid #EBEBEB', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 4, height: 16, background: '#E31837', borderRadius: 99 }} />
          <Globe size={14} color="#E31837" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>All Facilities</span>
          <span style={{ fontSize: 11, color: '#9CA3AF', background: '#F3F4F6', padding: '2px 8px', borderRadius: 99 }}>{warehouses?.length ?? 0} warehouses</span>
        </div>
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
          {warehouses?.map((wh: any) => {
            const isSelected = selectedWH?.id === wh.id
            const coords = WH_COORDS[wh.name]
            return (
              <button key={wh.id} onClick={() => setSelectedWH(isSelected ? null : wh)} style={{
                background: isSelected ? 'linear-gradient(135deg,#E31837,#C0152F)' : 'white',
                border: `1.5px solid ${isSelected ? '#E31837' : '#EBEBEB'}`,
                borderRadius: 12, padding: '12px 14px', textAlign: 'left', cursor: 'pointer',
                boxShadow: isSelected ? '0 4px 14px rgba(227,24,55,0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Warehouse size={14} color={isSelected ? 'rgba(255,255,255,0.9)' : '#E31837'} />
                  {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.8)' }} />}
                </div>
                <p style={{ fontSize: 11, fontWeight: 700, color: isSelected ? 'white' : '#111827', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wh.name}</p>
                <p style={{ fontSize: 10, color: isSelected ? 'rgba(255,255,255,0.6)' : '#9CA3AF' }}>{wh.country}</p>
                {coords && <p style={{ fontSize: 9, color: isSelected ? 'rgba(255,255,255,0.4)' : '#D1D5DB', marginTop: 3, fontFamily: 'monospace' }}>{coords[0].toFixed(1)}°, {coords[1].toFixed(1)}°</p>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
