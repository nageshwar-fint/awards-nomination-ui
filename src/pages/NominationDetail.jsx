import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getNomination, getNominationApprovals } from '../api/nominations'
import { getCycle } from '../api/cycles'
import { listCriteria } from '../api/criteria'
import { listUsers } from '../api/users'
import ApprovalActions from '../components/ApprovalActions'
import { useAuth } from '../auth/AuthContext'
import { getNominationStatusBadgeClass, getApprovalActionBadgeClass } from '../utils/statusBadges'
import { formatDateTime } from '../utils/dateUtils'
import { canApprove } from '../utils/cyclePermissions'
import { handleError } from '../utils/errorHandler'

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
      handleError(err, 'Failed to load nomination details', `nomination-detail-${id}`)
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

      {/* Scores/Answers */}
      {scores.length > 0 && (
        <div className="card mb-3">
          <div className="card-header">
            <h5 className="mb-0">Criteria Answers</h5>
          </div>
          <div className="card-body">
            {scores.map((score, index) => {
              const criteriaItem = criteria.find(c => c.id === score.criteria_id)
              const config = criteriaItem?.config || {}
              const questionType = config.type || 'legacy'
              
              return (
                <div key={index} className="mb-4 p-3 border rounded">
                  <h6 className="mb-2">
                    {getCriteriaName(score.criteria_id)}
                    {criteriaItem && (
                      <span className="text-muted ms-2 small">(Weight: {criteriaItem.weight})</span>
                    )}
                  </h6>
                  
                  {criteriaItem?.description && (
                    <p className="text-muted small mb-2">{criteriaItem.description}</p>
                  )}

                  {/* Legacy score display */}
                  {questionType === 'legacy' && (
                    <div>
                      <div className="mb-2">
                        <strong>Score:</strong> <span className="badge bg-primary">{score.score || 'N/A'}</span>
                      </div>
                      {score.comment && (
                        <div>
                          <strong>Comment:</strong> <p className="mb-0">{score.comment}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Flexible answer display */}
                  {score.answer && (
                    <div>
                      {questionType === 'text' && score.answer.text && (
                        <div>
                          <strong>Answer:</strong>
                          <p className="mb-0 mt-1">{score.answer.text}</p>
                        </div>
                      )}
                      
                      {questionType === 'single_select' && score.answer.selected && (
                        <div>
                          <strong>Selected:</strong>
                          <span className="badge bg-info ms-2">{score.answer.selected}</span>
                        </div>
                      )}
                      
                      {questionType === 'multi_select' && score.answer.selected_list && (
                        <div>
                          <strong>Selected:</strong>
                          <div className="mt-1">
                            {score.answer.selected_list.map((item, idx) => (
                              <span key={idx} className="badge bg-info me-1">{item}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {questionType === 'text_with_image' && (
                        <div>
                          {score.answer.text && (
                            <div className="mb-2">
                              <strong>Answer:</strong>
                              <p className="mb-0 mt-1">{score.answer.text}</p>
                            </div>
                          )}
                          {score.answer.image_url && (
                            <div>
                              <strong>Image:</strong>
                              <div className="mt-2">
                                <img 
                                  src={score.answer.image_url} 
                                  alt="Nomination evidence" 
                                  className="img-thumbnail"
                                  style={{ maxWidth: '400px', maxHeight: '400px' }}
                                  onError={(e) => {
                                    e.target.style.display = 'none'
                                    e.target.nextSibling.style.display = 'block'
                                  }}
                                />
                                <div style={{ display: 'none' }} className="text-danger small">
                                  Failed to load image
                                </div>
                                <div className="mt-1">
                                  <a href={score.answer.image_url} target="_blank" rel="noopener noreferrer">
                                    Open image in new tab
                                  </a>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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
                      {approval.rating !== null && approval.rating !== undefined && (
                        <span className="badge bg-warning text-dark ms-2">
                          Rating: {approval.rating}/10
                        </span>
                      )}
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

