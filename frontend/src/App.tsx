import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { App as AntApp } from 'antd'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'

import AiAssistant from './components/AiAssistant'
import ComingSoon from './components/ComingSoon'
import Categories from './pages/Categories'
import PurchaseRequests from './pages/PurchaseRequests'
import PurchaseOrders from './pages/PurchaseOrders'
import PurchaseOrderPrint from './pages/PurchaseOrderPrint'
import AccountsPayable from './pages/AccountsPayable'
import AccountsReceivable from './pages/AccountsReceivable'
import Suppliers from './pages/Suppliers'
import ShippingAddresses from './pages/ShippingAddresses'
import Companies from './pages/Companies'
import Locations from './pages/Locations'
import Customers from './pages/Customers'
import Projects from './pages/Projects'
import Invoices from './pages/Invoices'
import SalesReports from './pages/SalesReports'
import AccountingReports from './pages/AccountingReports'
import SalesAR from './pages/SalesAR'
import ProjectSourceFiles from './pages/ProjectSourceFiles'
import GoodsReceipt from './pages/GoodsReceipt'
import VWCKD from './pages/operation/vwckd/VWCKD'
import Users from './pages/Users'
import Roles from './pages/Roles'
import Permissions from './pages/Permissions'
import DatabaseAdmin from './pages/DatabaseAdmin'
import StorageStatus from './pages/StorageStatus'
import MenuCodes from './pages/MenuCodes'
import Notifications from './pages/Notifications'
import MaintenanceEquipment from './pages/MaintenanceEquipment'
import MaintenanceEquipmentTypes from './pages/MaintenanceEquipmentTypes'
import EquipmentDetail from './pages/EquipmentDetail'
import MaintenanceSchedules from './pages/MaintenanceSchedules'
import MaintenanceReports from './pages/MaintenanceReports'
import HrAssets from './pages/HrAssets'
import AdminAssets from './pages/AdminAssets'
import PalletSchedules from './pages/PalletSchedules'
import Containers from './pages/Containers'
import ProjectDashboard from './pages/ProjectDashboard'
import PalletProjects from './pages/PalletProjects'
import Calendar from './pages/Calendar'
import MasterBillingRules from './pages/MasterBillingRules'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { TabProvider } from './contexts/TabContext'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/sales" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/sales" replace /> : <Register />} />
      <Route path="/" element={user ? <Navigate to="/sales" replace /> : <Navigate to="/login" replace />} />
      <Route
        path="/print/purchase-orders/:id"
        element={
          <ProtectedRoute>
            <PurchaseOrderPrint />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Calendar />} />
      </Route>
      <Route
        path="/master-data"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/master-data/sales/customers" replace />} />
        <Route path="sales">
          <Route path="customers" element={<Customers />} />
          <Route path="billing-rules" element={<MasterBillingRules />} />
        </Route>
        <Route path="companies" element={<Companies />} />
        <Route path="locations" element={<Locations />} />
        <Route path="categories" element={<Categories />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="shipping-addresses" element={<ShippingAddresses />} />
        <Route path="equipment-types" element={<MaintenanceEquipmentTypes />} />
      </Route>
      <Route
        path="/sales"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/sales/projects" replace />} />
        <Route path="projects" element={<Projects />} />
        <Route path="pallet-projects" element={<PalletProjects />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="ar" element={<SalesAR />} />
        <Route path="reports" element={<SalesReports />} />
      </Route>
      <Route
        path="/accounting"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/accounting/accounts-payable" replace />} />
        <Route path="accounts-payable" element={<AccountsPayable />} />
        <Route path="accounts-receivable" element={<AccountsReceivable />} />
        <Route path="reports" element={<AccountingReports />} />
      </Route>
      <Route
        path="/purchase"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/purchase/purchase-requests" replace />} />
        <Route path="purchase-requests" element={<PurchaseRequests />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="purchase-orders/:id/print" element={<PurchaseOrderPrint />} />
        <Route path="goods-receipt" element={<GoodsReceipt />} />
        <Route path="goods-receipt" element={<GoodsReceipt />} />
        <Route path="reports" element={<ComingSoon title="Purchase Reports" />} />
      </Route>
      <Route
        path="/operation"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/sales" replace />} />
        <Route path="source-data" element={<ProjectSourceFiles />} />
        <Route path="projects/:projectId/source-data" element={<ProjectSourceFiles />} />
        <Route path="projects/:projectId/tm-packaging" element={<ProjectSourceFiles />} />
        <Route path="projects/:projectId/tm-storage" element={<ProjectSourceFiles />} />
        <Route path="projects/:projectId/vw-ckd" element={<VWCKD />} />
        <Route path="projects/:projectId/bsa" element={<ProjectSourceFiles />} />
        <Route path="projects/:projectId/mobis-ckd" element={<ProjectSourceFiles />} />
      </Route>
      <Route
        path="/production"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/production/pallet-schedules" replace />} />
        <Route path="pallet-schedules" element={<PalletSchedules />} />
        <Route path="containers" element={<Containers />} />
        <Route path="projects/:projectId/dashboard" element={<ProjectDashboard />} />
        <Route path="projects/:projectId/dashboard" element={<ProjectDashboard />} />
        <Route path="plans" element={<ComingSoon title="Production Plans" />} />
        <Route path="work-orders" element={<ComingSoon title="Work Orders" />} />
        <Route path="status" element={<ComingSoon title="Production Status" />} />
        <Route path="tracking" element={<ComingSoon title="Production Tracking" />} />
        <Route path="reports" element={<ComingSoon title="Production Reports" />} />
      </Route>
      <Route
        path="/quality"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/quality/inspections" replace />} />
        <Route index element={<Navigate to="/quality/inspections" replace />} />
        <Route path="inspections" element={<ComingSoon title="Quality Inspections" />} />
        <Route path="defects" element={<ComingSoon title="Defect Management" />} />
        <Route path="certificates" element={<ComingSoon title="Certificates" />} />
        <Route path="reports" element={<ComingSoon title="Quality Reports" />} />
      </Route>
      <Route
        path="/operation"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/sales" replace />} />
        <Route path="source-data" element={<ProjectSourceFiles />} />
        <Route path="projects/:projectId/source-data" element={<ProjectSourceFiles />} />
        <Route path="projects/:projectId/tm-packaging" element={<ProjectSourceFiles />} />
        <Route path="projects/:projectId/vw-ckd" element={<VWCKD />} />
        <Route path="projects/:projectId/bsa" element={<ProjectSourceFiles />} />
        <Route path="projects/:projectId/mobis-ckd" element={<ProjectSourceFiles />} />
        <Route path="maintenance">
          <Route index element={<Navigate to="/operation/maintenance/equipment" replace />} />
          <Route path="equipment" element={<MaintenanceEquipment />} />
          <Route path="equipment/:id" element={<EquipmentDetail />} />
          <Route path="equipment-types" element={<MaintenanceEquipmentTypes />} />
          <Route path="schedules" element={<MaintenanceSchedules />} />
          <Route path="reports" element={<MaintenanceReports />} />
        </Route>
      </Route>
      <Route
        path="/hr"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/hr/employees" replace />} />
        <Route index element={<Navigate to="/hr/employees" replace />} />
        <Route path="employees" element={<ComingSoon title="Employee Management" />} />
        <Route path="assets" element={<HrAssets />} />
        <Route path="attendance" element={<ComingSoon title="Attendance" />} />
        <Route path="payroll" element={<ComingSoon title="Payroll" />} />
        <Route path="recruitment" element={<ComingSoon title="Recruitment" />} />
        <Route path="reports" element={<ComingSoon title="HR Reports" />} />
      </Route>
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/users" replace />} />
        <Route path="users" element={<Users />} />
        <Route path="assets" element={<AdminAssets />} />
        <Route path="database" element={<DatabaseAdmin />} />
        <Route path="storage-status" element={<StorageStatus />} />
        <Route path="menu-codes" element={<MenuCodes />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="roles" element={<Roles />} />
        <Route path="permissions" element={<Permissions />} />
      </Route>
      <Route
        path="/system-admin"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/system-admin/users" replace />} />
        <Route path="users" element={<Users />} />
        <Route path="database" element={<DatabaseAdmin />} />
        <Route path="storage-status" element={<StorageStatus />} />
        <Route path="menu-codes" element={<MenuCodes />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="roles" element={<Roles />} />
        <Route path="permissions" element={<Permissions />} />
      </Route>
    </Routes>
  )
}

import { ConfigProvider } from 'antd';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TabProvider>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#1890ff',
                borderRadius: 8,
                fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
              },
              components: {
                Button: {
                  controlHeight: 40,
                  boxShadow: '0 2px 0 rgba(0, 0, 0, 0.045)',
                },
                Card: {
                  boxShadow: '0 1px 2px -2px rgba(0, 0, 0, 0.16), 0 3px 6px 0 rgba(0, 0, 0, 0.12), 0 5px 12px 4px rgba(0, 0, 0, 0.09)',
                },
                Table: {
                  headerBg: '#fafafa',
                  headerColor: 'rgba(0, 0, 0, 0.88)',
                  headerSplitColor: 'transparent',
                }
              }
            }}
          >
            <AntApp>
              <AppRoutes />
              <AiAssistant />
            </AntApp>
          </ConfigProvider>
        </TabProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

