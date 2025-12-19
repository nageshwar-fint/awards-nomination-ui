import { useEffect, useState } from 'react'
import { listUsers, deleteUser, activateUser, deactivateUser } from '../../api/admin'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { handleError } from '../../utils/errorHandler'
import { 
  FiUsers, 
  FiUser, 
  FiUserCheck, 
  FiShield, 
  FiTrash2, 
  FiEye,
  FiRefreshCw,
  FiSearch
} from 'react-icons/fi'

const ROLE_CONFIG = {
  HR: {
    label: 'HR',
    icon: FiShield,
    color: 'danger',
    bgColor: '#fee2e2',
    description: 'Human Resources - Full system access'
  },
  MANAGER: {
    label: 'Manager',
    icon: FiUserCheck,
    color: 'primary',
    bgColor: '#dbeafe',
    description: 'Managers - Can approve nominations and finalize cycles'
  },
  TEAM_LEAD: {
    label: 'Team Lead',
    icon: FiUser,
    color: 'info',
    bgColor: '#dbeafe',
    description: 'Team Leads - Can create cycles and submit nominations'
  },
  EMPLOYEE: {
    label: 'Employee',
    icon: FiUsers,
    color: 'secondary',
    bgColor: '#f3f4f6',
    description: 'Employees - Read-only access'
  }
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedRoles, setExpandedRoles] = useState({
    HR: true,
    MANAGER: true,
    TEAM_LEAD: true,
    EMPLOYEE: true
  })

  const loadUsers = async (search = '') => {
    setLoading(true)
    try {
      // Use the search parameter from the search term
      const params = search ? { search } : {}
      const data = await listUsers(params)
      setUsers(data)
    } catch (err) {
      handleError(err, 'Failed to load users', 'admin-users-load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // Reload users when search term changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(searchTerm)
    }, 500) // Debounce search by 500ms

    return () => clearTimeout(timer)
  }, [searchTerm])

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}"?`)) return
    
    try {
      await deleteUser(id)
      toast.success('User deleted successfully')
      setUsers(users.filter(u => u.id !== id))
    } catch (err) {
      handleError(err, 'Failed to delete user', `delete-user-${id}`)
    }
  }

  const handleActivate = async (id) => {
    try {
      await activateUser(id)
      toast.success('User activated successfully')
      setUsers(users.map(u =>
        u.id === id ? { ...u, status: 'ACTIVE' } : u
      ))
    } catch (err) {
      handleError(err, 'Failed to activate user', `activate-user-${id}`)
    }
  }

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Are you sure you want to deactivate user "${name}"?`)) return
    
    try {
      await deactivateUser(id)
      toast.success('User deactivated successfully')
      setUsers(users.map(u =>
        u.id === id ? { ...u, status: 'INACTIVE' } : u
      ))
    } catch (err) {
      handleError(err, 'Failed to deactivate user', `deactivate-user-${id}`)
    }
  }

  const toggleRoleSection = (role) => {
    setExpandedRoles(prev => ({
      ...prev,
      [role]: !prev[role]
    }))
  }

  // Group users by role (server-side search is handled by API)
  const usersByRole = users.reduce((acc, user) => {
    const role = user.role || 'EMPLOYEE'
    if (!acc[role]) {
      acc[role] = []
    }
    acc[role].push(user)
    return acc
  }, {})

  // Sort roles by priority
  const roleOrder = ['HR', 'MANAGER', 'TEAM_LEAD', 'EMPLOYEE']
  const sortedRoles = roleOrder.filter(role => usersByRole[role]?.length > 0)

  if (loading) {
    return (
      <div className="admin-users-container">
        <div className="admin-loading">
          <FiRefreshCw className="spinning" size={32} />
          <p>Loading users...</p>
        </div>
      </div>
    )
  }

  const totalUsers = users.length
  const activeUsers = users.filter(u => u.status === 'ACTIVE').length

  return (
    <div className="admin-users-container">
      {/* Header */}
      <div className="admin-users-header">
        <div>
          <h1 className="admin-users-title">User Management</h1>
          <p className="admin-users-subtitle">
            Manage all system users • {totalUsers} total users • {activeUsers} active
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link
            to="/admin/users/create"
            className="btn btn-primary"
          >
            <FiUsers className="me-2" />
            Create User
          </Link>
          <button
            className="btn btn-outline-primary"
            onClick={() => loadUsers(searchTerm)}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'spinning' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="admin-users-search">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="form-control search-input"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FiSearch className="search-icon-right" />
        </div>
      </div>

      {/* Role-based User Sections */}
      {sortedRoles.length > 0 ? (
        <div className="admin-users-sections">
          {sortedRoles.map((role) => {
            const roleUsers = usersByRole[role]
            const config = ROLE_CONFIG[role] || ROLE_CONFIG.EMPLOYEE
            const Icon = config.icon
            const isExpanded = expandedRoles[role]

            return (
              <div key={role} className="role-section">
                <div
                  className="role-section-header"
                  onClick={() => toggleRoleSection(role)}
                  style={{ backgroundColor: config.bgColor }}
                >
                  <div className="role-section-title">
                    <Icon className={`text-${config.color}`} size={24} />
                    <div>
                      <h3 className="role-label">{config.label}</h3>
                      <p className="role-description">{config.description}</p>
                    </div>
                  </div>
                  <div className="role-section-badge">
                    <span className={`badge bg-${config.color}`}>
                      {roleUsers.length} {roleUsers.length === 1 ? 'user' : 'users'}
                    </span>
                    <span className="toggle-icon">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="role-section-content">
                    <div className="users-table-wrapper">
                      <table className="table users-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Team</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roleUsers.map(user => (
                            <tr key={user.id} className={user.status !== 'ACTIVE' ? 'inactive-user' : ''}>
                              <td>
                                <div className="user-name-cell">
                                  <strong>{user.name || 'N/A'}</strong>
                                  {user.status !== 'ACTIVE' && (
                                    <span className="badge bg-secondary ms-2">Inactive</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className="text-muted">{user.email || 'N/A'}</span>
                              </td>
                              <td>
                                <span className={`badge ${
                                  user.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'
                                }`}>
                                  {user.status || 'UNKNOWN'}
                                </span>
                              </td>
                              <td>
                                <span className="text-muted">
                                  {user.team_id ? `Team ${user.team_id.slice(0, 8)}...` : 'No team'}
                                </span>
                              </td>
                              <td>
                                <div className="user-actions">
                                  <Link
                                    className="btn btn-sm btn-outline-primary"
                                    to={`/admin/users/${user.id}`}
                                    title="View Details"
                                  >
                                    <FiEye />
                                  </Link>

                                  {user.status !== 'ACTIVE' ? (
                                    <button
                                      className="btn btn-sm btn-outline-success"
                                      onClick={() => handleActivate(user.id)}
                                      title="Activate User"
                                    >
                                      Activate
                                    </button>
                                  ) : (
                                    <button
                                      className="btn btn-sm btn-outline-warning"
                                      onClick={() => handleDeactivate(user.id, user.name)}
                                      title="Deactivate User"
                                    >
                                      Deactivate
                                    </button>
                                  )}

                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDelete(user.id, user.name)}
                                    title="Delete User (Soft Delete)"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="admin-empty-state">
          <FiUsers size={64} className="text-muted mb-3" />
          <h4>No users found</h4>
          <p className="text-muted">
            {searchTerm ? 'Try adjusting your search terms' : 'No users in the system'}
          </p>
        </div>
      )}
    </div>
  )
}
