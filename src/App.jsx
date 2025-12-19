import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Cycles from './pages/Cycles'
import CycleDetail from './pages/CycleDetail'
import Approvals from './pages/Approvals'
import NominationDetail from './pages/NominationDetail'

import Navbar from './components/Navbar'
import ProtectedRoute from './auth/ProtectedRoute'
import { useAuth } from './auth/AuthContext'
import AdminRoute from './auth/AdminRoute'
import AdminUsers from './pages/admin/AdminUsers'
import AdminUserDetail from './pages/admin/AdminUserDetail'


function RootRedirect() {
  const { user } = useAuth()
  return user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Toaster />

      <Routes>
        {/* ROOT */}
        <Route path="/" element={<RootRedirect />} />

        {/* PUBLIC */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* PROTECTED */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cycles"
          element={
            <ProtectedRoute>
              <Cycles />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cycles/:id"
          element={
            <ProtectedRoute>
              <CycleDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/approvals"
          element={
            <ProtectedRoute>
              <Approvals />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nominations/:id"
          element={
            <ProtectedRoute>
              <NominationDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/users/:id"
          element={
            <AdminRoute>
              <AdminUserDetail />
            </AdminRoute>
          }
        />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
