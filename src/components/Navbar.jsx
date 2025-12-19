import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout()
      navigate('/login')
    }
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid">
        {/* Brand */}
        <Link className="navbar-brand" to="/">
          Awards System
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          {/* LEFT LINKS */}
          <ul className="navbar-nav me-auto">
            {user && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/dashboard">
                    Dashboard
                  </Link>
                </li>

                <li className="nav-item">
                  <Link className="nav-link" to="/cycles">
                    Cycles
                  </Link>
                </li>

                {/* Manager and HR */}
                {(user.role === 'MANAGER' || user.role === 'HR') && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/approvals">
                      Approvals
                    </Link>
                  </li>
                )}

                {/* HR-only */}
                {user.role === 'HR' && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/admin/users">
                      Admin
                    </Link>
                  </li>
                )}
              </>
            )}
          </ul>

          {/* RIGHT SIDE */}
          <ul className="navbar-nav ms-auto">
            {!user && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/login">
                    Login
                  </Link>
                </li>

                <li className="nav-item">
                  <Link className="nav-link" to="/register">
                    Register
                  </Link>
                </li>
              </>
            )}

            {user && (
              <>
                <li className="nav-item dropdown">
                  <button
                    className="btn btn-dark dropdown-toggle d-flex align-items-center gap-2"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    {user.profile_picture_url && (
                      <img 
                        src={user.profile_picture_url} 
                        alt={user.name || user.email || 'User'}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    )}
                    <span>{user.name || user.email || 'User'} ({user.role})</span>
                  </button>

                  <ul className="dropdown-menu dropdown-menu-end">
                    <li className="dropdown-item-text text-muted small px-3 py-2">
                      {user.email}
                    </li>

                    <li>
                      <hr className="dropdown-divider" />
                    </li>

                    <li>
                      <button
                        className="dropdown-item text-danger fw-bold"
                        onClick={handleLogout}
                      >
                        Logout
                      </button>
                    </li>
                  </ul>
                </li>
                
                {/* Direct Logout Button - Always visible */}
                <li className="nav-item">
                  <button
                    className="btn btn-outline-light ms-2"
                    onClick={handleLogout}
                    title="Logout"
                  >
                    Logout
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  )
}
