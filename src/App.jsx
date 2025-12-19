import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Cycles from './pages/Cycles'
import CycleDetail from './pages/CycleDetail'
import Approvals from './pages/Approvals'
import NominationDetail from './pages/NominationDetail'

import Layout from './components/Layout'
import ProtectedRoute from './auth/ProtectedRoute'
import { useAuth } from './auth/AuthContext'
import AdminRoute from './auth/AdminRoute'
import AdminUsers from './pages/admin/AdminUsers'
import AdminUserDetail from './pages/admin/AdminUserDetail'
import AdminUserCreate from './pages/admin/AdminUserCreate'


function RootRedirect() {
  const { user } = useAuth()
  return user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ROOT */}
        <Route path="/" element={<RootRedirect />} />

        {/* PUBLIC */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* PROTECTED WITH LAYOUT */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/cycles"
          element={
            <ProtectedRoute>
              <Layout>
                <Cycles />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/cycles/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <CycleDetail />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/approvals"
          element={
            <ProtectedRoute>
              <Layout>
                <Approvals />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/nominations/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <NominationDetail />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <Layout>
                <AdminUsers />
              </Layout>
            </AdminRoute>
          }
        />

        <Route
          path="/admin/users/create"
          element={
            <AdminRoute>
              <Layout>
                <AdminUserCreate />
              </Layout>
            </AdminRoute>
          }
        />

        <Route
          path="/admin/users/:id"
          element={
            <AdminRoute>
              <Layout>
                <AdminUserDetail />
              </Layout>
            </AdminRoute>
          }
        />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
