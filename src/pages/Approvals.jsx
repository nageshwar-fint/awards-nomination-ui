import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import ProtectedRoute from '../auth/ProtectedRoute'
import { useAuth } from '../auth/AuthContext'
import { listNominations, getNominationApprovals } from '../api/nominations'
import { approveNomination, rejectNomination } from '../api/approvals'
import { listCycles } from '../api/cycles'
import { listUsers } from '../api/admin'
import { getNominationStatusBadgeClass } from '../utils/statusBadges'
import { formatDateTime } from '../utils/dateUtils'
import { ROLES } from '../constants/roles'

function ApprovalsContent() {
  const navigate = useNavigate()
  const [nominations, setNominations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING') // PENDING, APPROVED, REJECTED, ALL
  const [cycles, setCycles] = useState([])
  const [users, setUsers] = useState([])
  const [selectedCycle, setSelectedCycle] = useState('')

  useEffect(() => {
    loadData()
  }, [filter, selectedCycle])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load cycles and users for display
      const [cyclesData, usersData] = await Promise.all([
        listCycles().catch(() => []),
        listUsers().catch(() => [])
      ])
      setCycles(cyclesData)
      setUsers(usersData)

      // Load nominations
      const params = {
        status_filter: filter !== 'ALL' ? filter : undefined,
        cycle_id: selectedCycle || undefined
      }
      const nominationsData = await listNominations(params)
      setNominations(nominationsData)
    } catch (err) {
      toast.error(err.message || 'Failed to load nominations')
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (nominationId, action) => {
    try {
      const reason = prompt(`Enter reason for ${action.toLowerCase()}:`)
      if (!reason) return

      if (action === 'approve') {
        await approveNomination({ nomination_id: nominationId, reason })
      } else {
        await rejectNomination({ nomination_id: nominationId, reason })
      }

      toast.success(`Nomination ${action}d successfully`)
      loadData()
    } catch (err) {
      toast.error(err.message || `Failed to ${action} nomination`)
    }
  }

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId)
    return user ? user.name : userId
  }

  const getCycleName = (cycleId) => {
    const cycle = cycles.find(c => c.id === cycleId)
    return cycle ? cycle.name : cycleId
  }

  return (
    <div className="container mt-4">
      <h3>Approvals</h3>

        {/* Filters */}
        <div className="card card-body mb-3">
          <div className="row">
            <div className="col-md-4">
              <label className="form-label">Status Filter</label>
              <select
                className="form-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Cycle Filter</label>
              <select
                className="form-select"
                value={selectedCycle}
                onChange={(e) => setSelectedCycle(e.target.value)}
              >
                <option value="">All Cycles</option>
                {cycles.map(cycle => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="alert alert-info">Loading nominations...</div>
        )}

        {/* Empty State */}
        {!loading && nominations.length === 0 && (
          <div className="alert alert-secondary">
            No nominations found with selected filters.
          </div>
        )}

        {/* Nominations List */}
        {!loading && nominations.length > 0 && (
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Nominee</th>
                  <th>Cycle</th>
                  <th>Submitted By</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {nominations.map((nomination) => (
                  <tr key={nomination.id}>
                    <td>{getUserName(nomination.nominee_user_id)}</td>
                    <td>
                      <a
                        href={`/cycles/${nomination.cycle_id}`}
                        onClick={(e) => {
                          e.preventDefault()
                          navigate(`/cycles/${nomination.cycle_id}`)
                        }}
                      >
                        {getCycleName(nomination.cycle_id)}
                      </a>
                    </td>
                    <td>{getUserName(nomination.submitted_by)}</td>
                    <td>
                      <span className={`badge ${getNominationStatusBadgeClass(nomination.status)}`}>
                        {nomination.status}
                      </span>
                    </td>
                    <td>{formatDateTime(nomination.submitted_at)}</td>
                    <td>
                      {nomination.status === 'PENDING' && (
                        <div className="btn-group">
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleApproval(nomination.id, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleApproval(nomination.id, 'reject')}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => navigate(`/nominations/${nomination.id}`)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}

export default function Approvals() {
  const { user } = useAuth()
  
  // Check if user has required role
  if (!user || (user.role !== ROLES.MANAGER && user.role !== ROLES.HR)) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          Access denied. Manager or HR role required.
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <ApprovalsContent />
    </ProtectedRoute>
  )
}

