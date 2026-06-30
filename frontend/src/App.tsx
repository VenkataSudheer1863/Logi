import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import OrdersPage from './pages/OrdersPage'
import WarehousePage from './pages/WarehousePage'
import InboundPage from './pages/InboundPage'
import IncidentsPage from './pages/IncidentsPage'
import AIInsightsPage from './pages/AIInsightsPage'
import AnalyticsPage from './pages/AnalyticsPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="warehouse" element={<WarehousePage />} />
          <Route path="inbound" element={<InboundPage />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="ai-insights" element={<AIInsightsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
