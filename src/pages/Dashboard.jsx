import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listCycles } from '../api/cycles'
import { listNominations } from '../api/nominations'
import { useAuth } from '../auth/AuthContext'
import { formatDateTime } from '../utils/dateUtils'
import { getCycleStatusBadgeClass, getNominationStatusBadgeClass } from '../utils/statusBadges'
import { canCreateCycle } from '../utils/cyclePermissions'
import toast from 'react-hot-toast'
import { handleError } from '../utils/errorHandler'
import { 
  FiCalendar, 
  FiCheckCircle, 
  FiClock, 
  FiTrendingUp,
  FiArrowRight,
  FiRefreshCw
} from 'react-icons/fi'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cycles, setCycles] = useState([])
  const [nominations, setNominations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [cyclesData, nominationsData] = await Promise.all([
        listCycles().catch(() => []),
        listNominations({ limit: 10 }).catch(() => [])
      ])
      setCycles(cyclesData)
      setNominations(nominationsData)
    } catch (err) {
      handleError(err, 'Failed to load dashboard data', 'dashboard-load')
    } finally {
      setLoading(false)
    }
  }

  const activeCycles = cycles.filter(c => c.status === 'OPEN')
  const draftCycles = cycles.filter(c => c.status === 'DRAFT')
  const pendingNominations = nominations.filter(n => n.status === 'PENDING')
  const approvedNominations = nominations.filter(n => n.status === 'APPROVED')
  const recentNominations = nominations.slice(0, 5)

  const statCards = [
    {
      title: 'Total Cycles',
      value: cycles.length,
      icon: FiCalendar,
      color: 'primary',
      bgColor: '#e3f2fd'
    },
    {
      title: 'Active Cycles',
      value: activeCycles.length,
      icon: FiCheckCircle,
      color: 'success',
      bgColor: '#e8f5e9'
    },
    {
      title: 'Draft Cycles',
      value: draftCycles.length,
      icon: FiClock,
      color: 'secondary',
      bgColor: '#f5f5f5'
    },
    {
      title: 'Pending Nominations',
      value: pendingNominations.length,
      icon: FiTrendingUp,
      color: 'warning',
      bgColor: '#fff3e0'
    }
  ]

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <FiRefreshCw className="spinning" size={32} />
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          {user && (
            <p className="dashboard-subtitle">
              Welcome back, <strong>{user.name}</strong> • {user.role}
            </p>
          )}
        </div>
        <button
          className="btn btn-outline-primary"
          onClick={loadData}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="dashboard-stats">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="stat-card">
              <div className="stat-card-icon" style={{ backgroundColor: stat.bgColor }}>
                <Icon size={24} className={`text-${stat.color}`} />
              </div>
              <div className="stat-card-content">
                <div className="stat-card-value">{stat.value}</div>
                <div className="stat-card-title">{stat.title}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Active Cycles */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3>Active Cycles</h3>
            {activeCycles.length > 0 && (
              <button
                className="btn btn-sm btn-link"
                onClick={() => navigate('/cycles')}
              >
                View All <FiArrowRight />
              </button>
            )}
          </div>
          <div className="dashboard-card-body">
            {activeCycles.length > 0 ? (
              <div className="cycle-list">
                {activeCycles.map((cycle) => (
                  <div
                    key={cycle.id}
                    className="cycle-item"
                    onClick={() => navigate(`/cycles/${cycle.id}`)}
                  >
                    <div className="cycle-item-content">
                      <h5 className="cycle-item-name">{cycle.name}</h5>
                      <p className="cycle-item-dates">
                        {formatDateTime(cycle.start_at)} - {formatDateTime(cycle.end_at)}
                      </p>
                    </div>
                    <div className="cycle-item-badge">
                      <span className={`badge ${getCycleStatusBadgeClass(cycle.status)}`}>
                        {cycle.status}
                      </span>
                      <FiArrowRight className="ms-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <FiCalendar size={48} className="text-muted mb-3" />
                <p className="text-muted">No active cycles at the moment</p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/cycles')}
                >
                  View All Cycles
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Nominations */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3>Recent Nominations</h3>
            {recentNominations.length > 0 && (
              <button
                className="btn btn-sm btn-link"
                onClick={() => navigate('/approvals')}
              >
                View All <FiArrowRight />
              </button>
            )}
          </div>
          <div className="dashboard-card-body">
            {recentNominations.length > 0 ? (
              <div className="nominations-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentNominations.map((nomination) => (
                      <tr key={nomination.id}>
                        <td>
                          <span className={`badge ${getNominationStatusBadgeClass(nomination.status)}`}>
                            {nomination.status}
                          </span>
                        </td>
                        <td>
                          <small className="text-muted">
                            {formatDateTime(nomination.submitted_at)}
                          </small>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => navigate(`/nominations/${nomination.id}`)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <FiCheckCircle size={48} className="text-muted mb-3" />
                <p className="text-muted">No nominations yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {user && canCreateCycle(user.role) && (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="dashboard-card-body">
            <div className="quick-actions">
              <button
                className="btn btn-primary"
                onClick={() => navigate('/cycles')}
              >
                <FiCalendar className="me-2" />
                Create New Cycle
              </button>
              {pendingNominations.length > 0 && (user.role === 'MANAGER' || user.role === 'HR') && (
                <button
                  className="btn btn-warning"
                  onClick={() => navigate('/approvals')}
                >
                  <FiCheckCircle className="me-2" />
                  Review {pendingNominations.length} Pending
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {cycles.length === 0 && nominations.length === 0 && (
        <div className="dashboard-card">
          <div className="dashboard-card-body">
            <div className="empty-state">
              <FiCalendar size={64} className="text-muted mb-4" />
              <h4>Welcome to Awards System!</h4>
              <p className="text-muted mb-4">
                {user && canCreateCycle(user.role) 
                  ? 'Get started by creating your first nomination cycle.'
                  : 'You have read-only access. Contact your team lead or manager to create cycles.'}
              </p>
              {user && canCreateCycle(user.role) && (
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/cycles')}
                >
                  Create Cycle
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
