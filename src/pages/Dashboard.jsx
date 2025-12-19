import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listCycles } from '../api/cycles'
import { listNominations } from '../api/nominations'
import { useAuth } from '../auth/AuthContext'
import { formatDateTime } from '../utils/dateUtils'
import { getCycleStatusBadgeClass, getNominationStatusBadgeClass } from '../utils/statusBadges'
import toast from 'react-hot-toast'

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
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const activeCycles = cycles.filter(c => c.status === 'OPEN')
  const draftCycles = cycles.filter(c => c.status === 'DRAFT')
  const pendingNominations = nominations.filter(n => n.status === 'PENDING')
  const recentNominations = nominations.slice(0, 5)

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="alert alert-info">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <h3>Dashboard</h3>
      {user && (
        <p className="text-muted">Welcome, {user.name} ({user.role})</p>
      )}

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Total Cycles</h5>
              <h2>{cycles.length}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Active Cycles</h5>
              <h2 className="text-success">{activeCycles.length}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Draft Cycles</h5>
              <h2 className="text-secondary">{draftCycles.length}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Pending Nominations</h5>
              <h2 className="text-warning">{pendingNominations.length}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Active Cycles */}
      {activeCycles.length > 0 && (
        <div className="card mb-3">
          <div className="card-header">
            <h5>Active Cycles</h5>
          </div>
          <div className="card-body">
            <div className="list-group">
              {activeCycles.map((cycle) => (
                <div
                  key={cycle.id}
                  className="list-group-item list-group-item-action"
                  onClick={() => navigate(`/cycles/${cycle.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex justify-content-between">
                    <div>
                      <strong>{cycle.name}</strong>
                      <br />
                      <small className="text-muted">
                        {formatDateTime(cycle.start_at)} - {formatDateTime(cycle.end_at)}
                      </small>
                    </div>
                    <span className={`badge ${getCycleStatusBadgeClass(cycle.status)}`}>
                      {cycle.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Nominations */}
      {recentNominations.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h5>Recent Nominations</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Cycle</th>
                    <th>Status</th>
                    <th>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {recentNominations.map((nomination) => (
                    <tr key={nomination.id}>
                      <td>
                        <button
                          className="btn btn-link p-0"
                          onClick={() => navigate(`/cycles/${nomination.cycle_id}`)}
                        >
                          View Cycle
                        </button>
                      </td>
                      <td>
                        <span className={`badge ${getNominationStatusBadgeClass(nomination.status)}`}>
                          {nomination.status}
                        </span>
                      </td>
                      <td>{formatDateTime(nomination.submitted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {cycles.length === 0 && nominations.length === 0 && (
        <div className="alert alert-secondary">
          No data available. Create a cycle to get started!
        </div>
      )}
    </div>
  )
}
