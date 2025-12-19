import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { 
  FiHome, 
  FiCalendar, 
  FiCheckCircle, 
  FiUsers, 
  FiLogOut,
  FiMenu,
  FiX
} from 'react-icons/fi'
import { useState } from 'react'

export default function Sidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout()
      window.location.href = '/login'
    }
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const menuItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: FiHome,
      roles: ['EMPLOYEE', 'TEAM_LEAD', 'MANAGER', 'HR']
    },
    {
      path: '/cycles',
      label: 'Cycles',
      icon: FiCalendar,
      roles: ['EMPLOYEE', 'TEAM_LEAD', 'MANAGER', 'HR']
    },
    {
      path: '/approvals',
      label: 'Approvals',
      icon: FiCheckCircle,
      roles: ['MANAGER', 'HR']
    },
    {
      path: '/admin/users',
      label: 'Admin',
      icon: FiUsers,
      roles: ['HR']
    }
  ]

  const visibleMenuItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  )

  const SidebarContent = () => (
    <>
      {/* Logo/Brand */}
      <div className="sidebar-brand">
        <h4 className="mb-0">
          <span className="brand-icon">🏆</span>
          <span className="brand-text">Awards System</span>
        </h4>
      </div>

      {/* User Info */}
      {user && (
        <div className="sidebar-user">
          <div className="user-avatar">
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user.name || 'User'}</div>
            <div className="user-role">{user.role}</div>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setIsMobileOpen(false)}
            >
              <Icon className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      {user && (
        <div className="sidebar-footer">
          <button
            className="sidebar-nav-item sidebar-logout"
            onClick={handleLogout}
          >
            <FiLogOut className="nav-icon" />
            <span className="nav-label">Logout</span>
          </button>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle sidebar"
      >
        {isMobileOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <SidebarContent />
      </aside>
    </>
  )
}
