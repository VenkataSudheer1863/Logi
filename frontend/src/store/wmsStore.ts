import { create } from 'zustand'
import type { Status } from '../lib/wsManager'

interface WMSState {
  selectedWarehouseId: number | null
  wsStatus: Status
  wsAttempt: number
  notifications: Array<{ id: string; message: string; type: 'info' | 'warning' | 'error' | 'success'; ts: number }>
  // derived
  wsConnected: boolean
  setWarehouse: (id: number) => void
  setWsStatus: (status: Status, attempt?: number) => void
  addNotification: (msg: string, type?: WMSState['notifications'][0]['type']) => void
  clearNotification: (id: string) => void
  clearAllNotifications: () => void
}

export const useWMSStore = create<WMSState>((set) => ({
  selectedWarehouseId: 1,
  wsStatus: 'disconnected',
  wsAttempt: 0,
  wsConnected: false,
  notifications: [],

  setWarehouse: (id) => set({ selectedWarehouseId: id }),

  setWsStatus: (status, attempt = 0) =>
    set({ wsStatus: status, wsAttempt: attempt, wsConnected: status === 'connected' }),

  addNotification: (message, type = 'info') =>
    set((s) => ({
      notifications: [
        ...s.notifications.slice(-9),
        { id: crypto.randomUUID(), message, type, ts: Date.now() },
      ],
    })),

  clearNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  clearAllNotifications: () => set({ notifications: [] }),
}))
