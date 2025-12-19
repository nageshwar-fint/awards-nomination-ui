import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getNomination, getNominationApprovals } from '../api/nominations'
import { getCycle } from '../api/cycles'
import { listCriteria } from '../api/criteria'
import { listUsers } from '../api/admin'
import ApprovalActions from '../components/ApprovalActions'
import { useAuth } from '../auth/AuthContext'
import { getNominationStatusBadgeClass, getApprovalActionBadgeClass } from '../utils/statusBadges'
import { formatDateTime } from '../utils/dateUtils'
import { canApprove } from '../utils/cyclePermissions'

export default function NominationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [nomination, setNomination] = useState(null)
  const [cycle, setCycle] = useState(null)
  const [criteria, setCriteria] = useState([])
  const [scores, setScores] = useState([])
  const [approvals, setApprovals] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [nominationData, usersData] = await Promise.all([
        getNomination(id),
        listUsers().catch(() => [])
      ])
      setNomination(nominationData)
      setUsers(usersData)

      // Load cycle and criteria
      if (nominationData.cycle_id) {
        const [cycleData, criteriaData, approvalsData] = await Promise.all([
          getCycle(nominationData.cycle_id).catch(() => null),
          listCriteria(nominationData.cycle_id).catch(() => []),
          getNominationApprovals(id).catch(() => [])
        ])
        setCycle(cycleData)
        setCriteria(criteriaData)
        setApprovals(approvalsData)

        // Load scores if available
        if (nominationData.scores) {
          setScores(nominationData.scores)
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load nomination details')
    } finally {
      setLoading(false)
    }
  }

  const getUserName = (userId) => {
    const foundUser = users.find(u => u.id === userId)
    return foundUser ? foundUser.name : userId
  }

  const getUserEmail = (userId) => {
    const foundUser = users.find(u => u.id === userId)
    return foundUser ? foundUser.email : ''
  }

  const getCriteriaName = (criteriaId) => {
    const foundCriteria = criteria.find(c => c.id === criteriaId)
    return foundCriteria ? foundCriteria.name : criteriaId
  }

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="alert alert-info">Loading nomination details...</div>
      </div>
    )
  }

  if (!nomination) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">Nomination not found</div>
      </div>
    )
  }

  const canApproveNomination = user && canApprove(nomination, user.role)

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Nomination Details</h3>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
      </div>

      {/* Nomination Info */}
      <div className="card mb-3">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Nomination Information</h5>
            <span className={`badge ${getNominationStatusBadgeClass(nomination.status)}`}>
              {nomination.status}
            </span>
          </div>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <strong>Nominee:</strong>{' '}
              {getUserName(nomination.nominee_user_id)}
              <br />
              <small className="text-muted">
                {getUserEmail(nomination.nominee_user_id)}
              </small>
            </div>
            <div className="col-md-6">
              <strong>Submitted By:</strong>{' '}
              {getUserName(nomination.submitted_by)}
              <br />
              <small className="text-muted">
                {getUserEmail(nomination.submitted_by)}
              </small>
            </div>
          </div>
          {cycle && (
            <div className="mt-2">
              <strong>Cycle:</strong>{' '}
              <a
                href={`/cycles/${cycle.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  navigate(`/cycles/${cycle.id}`)
                }}
              >
                {cycle.name}
              </a>
            </div>
          )}
          <div className="mt-2">
            <strong>Submitted At:</strong> {formatDateTime(nomination.submitted_at)}
          </div>
        </div>
      </div>

      {/* Scores */}
      {scores.length > 0 && (
        <div className="card mb-3">
          <div className="card-header">
            <h5 className="mb-0">Scores</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Criteria</th>
                    <th>Score</th>
                    <th>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((score, index) => (
                    <tr key={index}>
                      <td>{getCriteriaName(score.criteria_id)}</td>
                      <td><strong>{score.score}</strong></td>
                      <td>{score.comment || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Approval Actions */}
      {canApproveNomination && (
        <div className="card mb-3">
          <div className="card-header">
            <h5 className="mb-0">Actions</h5>
          </div>
          <div className="card-body">
            <ApprovalActions
              nominationId={nomination.id}
              onActionComplete={loadData}
            />
          </div>
        </div>
      )}

      {/* Approval History */}
      {approvals.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Approval History</h5>
          </div>
          <div className="card-body">
            <div className="list-group">
              {approvals.map((approval) => (
                <div key={approval.id} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <span className={`badge ${getApprovalActionBadgeClass(approval.action)} me-2`}>
                        {approval.action}
                      </span>
                      <strong>{getUserName(approval.actor_user_id)}</strong>
                      {approval.reason && (
                        <div className="mt-1">
                          <small className="text-muted">{approval.reason}</small>
                        </div>
                      )}
                    </div>
                    <small className="text-muted">
                      {formatDateTime(approval.acted_at)}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

