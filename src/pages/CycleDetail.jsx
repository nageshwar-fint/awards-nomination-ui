import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { getCycle, updateCycle } from '../api/cycles'
import { listCriteria } from '../api/criteria'
import { listNominations, getNomination } from '../api/nominations'
import { approveNomination, rejectNomination } from '../api/approvals'
import { listUsers } from '../api/users'
import CriteriaManager from '../components/CriteriaManager'
import NominationForm from '../components/NominationForm'
import RankingsPanel from '../components/RankingsPanel'
import { useAuth } from '../auth/AuthContext'
import { canEditCycle, canSubmitNomination } from '../utils/cyclePermissions'
import { getCycleStatusBadgeClass, getNominationStatusBadgeClass } from '../utils/statusBadges'
import { formatDateTime, formatDateForInput } from '../utils/dateUtils'
import { handleError } from '../utils/errorHandler'
import { FiX } from 'react-icons/fi'

export default function CycleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cycle, setCycle] = useState(null)
  const [criteria, setCriteria] = useState([])
  const [nominations, setNominations] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)
  const { register, handleSubmit, reset } = useForm()
  
  // Approval form state
  const [selectedNomination, setSelectedNomination] = useState(null)
  const [showApprovalForm, setShowApprovalForm] = useState(false)
  const [actionType, setActionType] = useState(null) // 'approve' or 'reject'
  const [reason, setReason] = useState('')
  const [rating, setRating] = useState('')
  const [approvalCriteria, setApprovalCriteria] = useState([])
  const [nominationScores, setNominationScores] = useState([])
  const [criteriaReviews, setCriteriaReviews] = useState({}) // { criteriaId: { rating } }
  const [loadingNominationDetails, setLoadingNominationDetails] = useState(false)
  const [ratingErrors, setRatingErrors] = useState({}) // { criteriaId: errorMessage }

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    
    try {
      // Load cycle first - if this fails, show error and stop
      let cycleData
      try {
        cycleData = await getCycle(id)
      } catch (err) {
        handleError(err, 'Failed to load cycle', `cycle-load-${id}`)
        setLoading(false)
        return // Stop here if cycle fails
      }

      // Load other data in parallel (these can fail silently)
      // Load active criteria for nomination form, all criteria for CriteriaManager
      const [criteriaData, nominationsData, usersData] = await Promise.all([
        listCriteria(id, true).catch(() => []), // Only active criteria for nomination form
        listNominations({ cycle_id: id }).catch(() => []),
        listUsers().catch(() => [])
      ])
      
      setCycle(cycleData)
      setCriteria(criteriaData)
      setNominations(nominationsData)
      setUsers(usersData)
      
      console.log('CycleDetail - Loaded data:', {
        cycle: cycleData?.name,
        status: cycleData?.status,
        criteriaCount: criteriaData?.length,
        activeCriteriaCount: criteriaData?.filter(c => c.is_active)?.length
      })
      
      // Reset form with cycle data
      reset({
        name: cycleData.name,
        start_at: formatDateForInput(cycleData.start_at),
        end_at: formatDateForInput(cycleData.end_at),
        status: cycleData.status
      })
    } catch (err) {
      // This should rarely be hit now, but handle just in case
      handleError(err, 'Failed to load data', `cycle-load-${id}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCycle = async (data) => {
    try {
      // Convert date to ISO string (set start date to beginning of day, end date to end of day)
      const updateData = { ...data }
      
      // For non-DRAFT cycles, only allow status and dates
      if (cycle.status !== 'DRAFT') {
        delete updateData.name
        // For CLOSED cycles, only allow status
        if (cycle.status === 'CLOSED') {
          delete updateData.start_at
          delete updateData.end_at
        }
      }
      
      if (data.start_at) {
        const startDate = new Date(data.start_at)
        startDate.setHours(0, 0, 0, 0)
        updateData.start_at = startDate.toISOString()
      }
      
      if (data.end_at) {
        const endDate = new Date(data.end_at)
        endDate.setHours(23, 59, 59, 999)
        updateData.end_at = endDate.toISOString()
      }
      
      await updateCycle(id, updateData)
      toast.success('Cycle updated successfully')
      setShowEditForm(false)
      loadData()
    } catch (err) {
      handleError(err, 'Failed to update cycle', `cycle-update-${id}`)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!window.confirm(`Change cycle status to ${newStatus}?`)) return
    
    try {
      await updateCycle(id, { status: newStatus })
      toast.success(`Cycle status changed to ${newStatus}`)
      loadData()
    } catch (err) {
      handleError(err, 'Failed to update status', `cycle-status-${id}`)
    }
  }

  const getUserName = (nomination, field) => {
    // Use name from API response if available
    if (field === 'nominee' && nomination?.nominee_name) {
      return nomination.nominee_name
    }
    if (field === 'submitted_by' && nomination?.submitted_by_name) {
      return nomination.submitted_by_name
    }
    // Fallback to user lookup
    const userId = field === 'nominee' ? nomination?.nominee_user_id : nomination?.submitted_by
    const foundUser = users.find(u => u.id === userId)
    return foundUser ? foundUser.name : userId
  }
  
  const getUserNameById = (userId) => {
    const foundUser = users.find(u => u.id === userId)
    return foundUser ? foundUser.name : userId
  }

  const handleReviewNomination = async (nomination) => {
    // Only allow review for pending nominations if user is MANAGER or HR
    if (nomination.status !== 'PENDING' || (user?.role !== 'MANAGER' && user?.role !== 'HR')) {
      navigate(`/nominations/${nomination.id}`)
      return
    }

    setSelectedNomination(nomination)
    setShowApprovalForm(true)
    setActionType(null)
    setReason('')
    setRating('')
    setCriteriaReviews({})
    
    // Load nomination details with criteria and scores
    setLoadingNominationDetails(true)
    try {
      const [nominationData, criteriaData] = await Promise.all([
        getNomination(nomination.id),
        listCriteria(nomination.cycle_id).catch(() => [])
      ])
      
      setApprovalCriteria(criteriaData.filter(c => c.is_active))
      setNominationScores(nominationData.scores || [])
      
      // Initialize criteria reviews with empty values
      const initialReviews = {}
      criteriaData.filter(c => c.is_active).forEach(crit => {
        initialReviews[crit.id] = { rating: '' }
      })
      setCriteriaReviews(initialReviews)
    } catch (err) {
      handleError(err, 'Failed to load nomination details', `cycle-approval-load-${nomination.id}`)
    } finally {
      setLoadingNominationDetails(false)
    }
  }

  const handleActionClick = (action) => {
    setActionType(action)
  }

  const calculateTotalRating = () => {
    let totalWeightedRating = 0
    let totalWeight = 0
    
    approvalCriteria.forEach(crit => {
      const review = criteriaReviews[crit.id]
      const weight = parseFloat(crit.weight) || 0
      
      // If no rating entered, treat as 0
      let rating = 0
      if (review && review.rating !== '') {
        rating = parseFloat(review.rating) || 0
        
        // Clamp rating to valid range (0 to weight)
        if (rating < 0) rating = 0
        if (rating > weight) rating = weight
      }
      
      totalWeightedRating += rating
      totalWeight += weight
    })
    
    if (totalWeight === 0) return 0
    
    // Scale to 0-10
    return (totalWeightedRating / totalWeight) * 10
  }

  const handleCriteriaReviewChange = (criteriaId, field, value) => {
    // Validate rating if it's a rating field
    if (field === 'rating') {
      const crit = approvalCriteria.find(c => c.id === criteriaId)
      if (crit) {
        const weight = parseFloat(crit.weight) || 0
        const ratingValue = value === '' ? '' : parseFloat(value)
        
        // Check if value is empty (allow empty for now, will validate on submit)
        if (value === '') {
          setRatingErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors[criteriaId]
            return newErrors
          })
        } else if (isNaN(ratingValue)) {
          // Invalid number
          setRatingErrors(prev => ({
            ...prev,
            [criteriaId]: 'Please enter a valid number'
          }))
          return // Don't update the value
        } else {
          // Clamp value to valid range immediately
          let clampedValue = ratingValue
          if (ratingValue < 0) {
            clampedValue = 0
            setRatingErrors(prev => ({
              ...prev,
              [criteriaId]: `Rating cannot be less than 0`
            }))
          } else if (ratingValue > weight) {
            clampedValue = weight
            setRatingErrors(prev => ({
              ...prev,
              [criteriaId]: `Rating cannot exceed ${weight} (criterion weight). Set to maximum.`
            }))
          } else {
            // Valid value - clear error
            setRatingErrors(prev => {
              const newErrors = { ...prev }
              delete newErrors[criteriaId]
              return newErrors
            })
          }
          
          // Use clamped value if it was out of range
          if (clampedValue !== ratingValue) {
            value = clampedValue.toString()
          }
        }
      }
    }
    
    setCriteriaReviews(prev => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId],
        [field]: value
      }
    }))
    
    // Auto-calculate total rating when criteria reviews change
    if (field === 'rating') {
      const calculatedRating = calculateTotalRating()
      setRating(calculatedRating.toFixed(2))
    }
  }

  const handleApproval = async () => {
    if (!selectedNomination || !actionType) return
    
    // Validate reason is mandatory
    if (!reason.trim()) {
      handleError('Please provide a reason', 'Please provide a reason', `cycle-approval-reason-${selectedNomination.id}`)
      return
    }

    // For approve action, validate all criteria reviews are completed
    if (actionType === 'approve') {
      const missingReviews = approvalCriteria.filter(crit => {
        const review = criteriaReviews[crit.id]
        return !review || !review.rating || review.rating === ''
      })
      
      if (missingReviews.length > 0) {
        handleError(
          'Please provide ratings for all criteria', 
          'Please provide ratings for all criteria', 
          `cycle-approval-criteria-${selectedNomination.id}`
        )
        return
      }
      
      // Validate all ratings are within their criterion weights
      for (const crit of approvalCriteria) {
        const review = criteriaReviews[crit.id]
        if (review && review.rating !== '') {
          const rating = parseFloat(review.rating)
          const weight = parseFloat(crit.weight)
          if (rating < 0 || rating > weight) {
            handleError(
              `Rating for "${crit.name}" must be between 0 and ${weight}`,
              `Rating for "${crit.name}" must be between 0 and ${weight}`,
              `cycle-approval-rating-${crit.id}`
            )
            return
          }
        }
      }
      
      // Calculate and validate total rating
      const calculatedRating = calculateTotalRating()
      if (calculatedRating < 0 || calculatedRating > 10) {
        handleError('Total rating must be between 0 and 10', 'Total rating must be between 0 and 10', `cycle-approval-total-${selectedNomination.id}`)
        return
      }
    }

    try {
      const payload = {
        nomination_id: selectedNomination.id,
        reason: reason.trim()
      }
      
      // Add criteria reviews for approve action
      if (actionType === 'approve') {
        const reviews = approvalCriteria.map(crit => {
          const review = criteriaReviews[crit.id]
          const weight = parseFloat(crit.weight) || 0
          let rating = 0
          
          if (review && review.rating !== '') {
            rating = parseFloat(review.rating) || 0
            // Ensure rating is within bounds
            if (rating < 0) rating = 0
            if (rating > weight) rating = weight
          }
          
          return {
            criteria_id: crit.id,
            rating: rating
          }
        })
        payload.criteria_reviews = reviews
        
        // Add calculated total rating
        const calculatedRating = calculateTotalRating()
        payload.rating = calculatedRating
      }

      if (actionType === 'approve') {
        await approveNomination(payload)
      } else {
        await rejectNomination(payload)
      }

      toast.success(`Nomination ${actionType}d successfully`)
      setShowApprovalForm(false)
      setSelectedNomination(null)
      setActionType(null)
      setReason('')
      setRating('')
      setCriteriaReviews({})
      setApprovalCriteria([])
      setNominationScores([])
      setRatingErrors({})
      loadData()
    } catch (err) {
      handleError(err, `Failed to ${actionType} nomination`, `cycle-approval-${actionType}-${selectedNomination.id}`)
    }
  }

  const handleCancelForm = () => {
    setShowApprovalForm(false)
    setSelectedNomination(null)
    setActionType(null)
    setReason('')
    setRating('')
    setCriteriaReviews({})
    setApprovalCriteria([])
    setNominationScores([])
    setRatingErrors({})
  }
  
  const getCriteriaAnswer = (criteriaId) => {
    return nominationScores.find(s => s.criteria_id === criteriaId)
  }

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="alert alert-info">Loading cycle details...</div>
      </div>
    )
  }

  if (!cycle) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">Cycle not found</div>
      </div>
    )
  }

  const canEdit = user && canEditCycle(cycle, user.role)
  const canSubmit = user && canSubmitNomination(cycle, user.role)

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3>{cycle.name}</h3>
          <span className={`badge ${getCycleStatusBadgeClass(cycle.status)}`}>
            {cycle.status}
          </span>
        </div>
        <div>
          <button
            className="btn btn-outline-secondary me-2"
            onClick={() => navigate('/cycles')}
          >
            Back to Cycles
          </button>
          {canEdit && (
            <button
              className="btn btn-primary"
              onClick={() => setShowEditForm(!showEditForm)}
            >
              {showEditForm ? 'Cancel Edit' : 'Edit Cycle'}
            </button>
          )}
        </div>
      </div>

      {/* Cycle Info */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <strong>Start Date:</strong> {formatDateTime(cycle.start_at)}
            </div>
            <div className="col-md-6">
              <strong>End Date:</strong> {formatDateTime(cycle.end_at)}
            </div>
          </div>
          {cycle.created_by && (
            <div className="mt-2">
              <strong>Created By:</strong> {getUserNameById(cycle.created_by)}
            </div>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {showEditForm && canEdit && (
        <div className="card card-body mb-3">
          <h5>Edit Cycle</h5>
          {cycle.status !== 'DRAFT' && (
            <div className="alert alert-warning mb-3">
              <small>
                {cycle.status === 'OPEN' && 'Only status and dates can be updated for OPEN cycles.'}
                {cycle.status === 'CLOSED' && 'Only status can be updated for CLOSED cycles.'}
              </small>
            </div>
          )}
          <form onSubmit={handleSubmit(handleUpdateCycle)}>
            {cycle.status === 'DRAFT' && (
            <div className="mb-2">
              <label className="form-label">Name</label>
              <input
                className="form-control"
                {...register('name', { required: true })}
              />
            </div>
            )}
            {cycle.status !== 'CLOSED' && (
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-control"
                  {...register('start_at', { required: true })}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-control"
                  {...register('end_at', { required: true })}
                />
              </div>
            </div>
            )}
            {(cycle.status === 'DRAFT' || cycle.status === 'OPEN' || cycle.status === 'CLOSED') && (
              <div className="mb-2">
                <label className="form-label">Status</label>
                <select className="form-select" {...register('status')}>
                  {cycle.status === 'DRAFT' && (
                    <>
                  <option value="DRAFT">DRAFT</option>
                  <option value="OPEN">OPEN</option>
                    </>
                  )}
                  {cycle.status === 'OPEN' && (
                    <>
                      <option value="OPEN">OPEN</option>
                      <option value="DRAFT">DRAFT</option>
                      <option value="CLOSED">CLOSED</option>
                    </>
                  )}
                  {cycle.status === 'CLOSED' && (
                    <>
                      <option value="CLOSED">CLOSED</option>
                      <option value="OPEN">OPEN</option>
                    </>
                  )}
                </select>
              </div>
            )}
            <div>
              <button type="submit" className="btn btn-success me-2">
                Save Changes
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowEditForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Status Actions */}
      {canEdit && (
        <div className="alert alert-info mb-3">
          <strong>Quick Actions:</strong>{' '}
          {cycle.status === 'DRAFT' && (
          <button
              className="btn btn-sm btn-success me-2"
            onClick={() => handleStatusChange('OPEN')}
          >
            Open Cycle
          </button>
          )}
          {cycle.status === 'OPEN' && (
            <>
              <button
                className="btn btn-sm btn-warning me-2"
                onClick={() => handleStatusChange('DRAFT')}
              >
                Change to DRAFT
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => handleStatusChange('CLOSED')}
              >
                Close Cycle
              </button>
            </>
          )}
        </div>
      )}

      {/* Criteria Manager */}
      <CriteriaManager cycle={cycle} />

      {/* Nominations List */}
      {nominations.length > 0 && (
        <div className="mt-4">
          <h5>Nominations ({nominations.length})</h5>
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Nominee</th>
                  <th>Submitted By</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {nominations.map((nomination) => (
                  <tr key={nomination.id}>
                    <td>{getUserName(nomination, 'nominee')}</td>
                    <td>{getUserName(nomination, 'submitted_by')}</td>
                    <td>
                      <span className={`badge ${getNominationStatusBadgeClass(nomination.status)}`}>
                        {nomination.status}
                      </span>
                    </td>
                    <td>{formatDateTime(nomination.submitted_at)}</td>
                    <td>
                      {nomination.status === 'PENDING' && (user?.role === 'MANAGER' || user?.role === 'HR') ? (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleReviewNomination(nomination)}
                        >
                          Review
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => navigate(`/nominations/${nomination.id}`)}
                        >
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Nomination Form */}
      {canSubmit && cycle.status === 'OPEN' && (
        <NominationForm
          cycle={cycle}
          criteria={criteria.filter(c => c.is_active)}
          onSubmitted={loadData}
        />
      )}

      {/* Rankings Panel */}
      {(cycle.status === 'CLOSED' || cycle.status === 'FINALIZED') && (
        <RankingsPanel cycle={cycle} onFinalized={loadData} />
      )}

      {/* Approval Form Modal - Similar to Dashboard/Approvals */}
      {showApprovalForm && selectedNomination && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Review Nomination: {getUserName(selectedNomination, 'nominee')}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCancelForm}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                {loadingNominationDetails ? (
                  <div className="alert alert-info">Loading nomination details...</div>
                ) : (
                  <>
                    {/* Criteria Review Section */}
                    {actionType === 'approve' && approvalCriteria.length > 0 && (
                      <div className="mb-4">
                        <h6 className="mb-3">Review Criteria (Please provide rating for each criterion)</h6>
                        {approvalCriteria.map((crit) => {
                          const score = getCriteriaAnswer(crit.id)
                          const review = criteriaReviews[crit.id] || { rating: '' }
                          
                          return (
                            <div key={crit.id} className="card mb-3">
                              <div className="card-body">
                                <h6 className="mb-2">
                                  {crit.name}
                                  <span className="text-muted ms-2 small">(Weight: {crit.weight})</span>
                                </h6>
                                {crit.description && (
                                  <p className="text-muted small mb-2">{crit.description}</p>
                                )}
                                
                                {/* Show nominee's answer */}
                                <div className="mb-3 p-2 bg-light rounded">
                                  <strong>Nominee's Answer:</strong>
                                  <div className="mt-1">
                                    {score ? (
                                      <div>
                                        {score.answer?.text && <p className="mb-0">{score.answer.text}</p>}
                                        {score.answer?.selected && (
                                          <span className="badge bg-info">{score.answer.selected}</span>
                                        )}
                                        {score.answer?.selected_list && Array.isArray(score.answer.selected_list) && (
                                          <div>
                                            {score.answer.selected_list.map((item, idx) => (
                                              <span key={idx} className="badge bg-info me-1">{item}</span>
                                            ))}
                                          </div>
                                        )}
                                        {score.answer?.image_url && (
                                          <div className="mt-2">
                                            <img src={score.answer.image_url} alt="Answer" style={{ maxWidth: '200px', maxHeight: '200px' }} />
                                          </div>
                                        )}
                                        {!score.answer && score.score && (
                                          <span className="badge bg-primary">Score: {score.score}</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted">No answer provided</span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Manager's review */}
                                <div className="row">
                                  <div className="col-md-12 mb-2">
                                    <label className="form-label small">
                                      Your Rating (0 - {crit.weight}) *
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      max={crit.weight}
                                      step="0.01"
                                      className={`form-control form-control-sm ${ratingErrors[crit.id] ? 'is-invalid' : ''}`}
                                      placeholder={`0 - ${crit.weight}`}
                                      value={review.rating}
                                      onChange={(e) => handleCriteriaReviewChange(crit.id, 'rating', e.target.value)}
                                      onBlur={(e) => handleCriteriaReviewChange(crit.id, 'rating', e.target.value, true)}
                                      required
                                    />
                                    {ratingErrors[crit.id] && (
                                      <div className="invalid-feedback d-block">
                                        {ratingErrors[crit.id]}
                                      </div>
                                    )}
                                    <small className="form-text text-muted">
                                      Maximum allowed: {crit.weight}
                                    </small>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        
                        {/* Calculated Total Rating */}
                        <div className="alert alert-info">
                          <strong>Calculated Total Rating:</strong> {rating ? `${parseFloat(rating).toFixed(2)} / 10` : '0.00 / 10 (no ratings entered yet)'}
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    {!actionType ? (
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-success"
                          onClick={() => handleActionClick('approve')}
                          disabled={selectedNomination.status !== 'PENDING'}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleActionClick('reject')}
                          disabled={selectedNomination.status !== 'PENDING'}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-3">
                          <label className="form-label">
                            Overall Comments/Reason for {actionType === 'approve' ? 'approval' : 'rejection'} *
                          </label>
                          <textarea
                            className="form-control"
                            rows="4"
                            placeholder="Enter your overall comments and reason..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                          />
                        </div>
                        
                        {actionType === 'approve' && (
                          <div className="mb-3">
                            <label className="form-label">
                              Overall Rating (Auto-calculated from criteria reviews) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.01"
                              className="form-control"
                              value={rating}
                              readOnly
                              style={{ backgroundColor: '#f8f9fa' }}
                            />
                            <small className="text-muted">This is automatically calculated from your criteria reviews</small>
                          </div>
                        )}
                        
                        <div className="d-flex gap-2">
                          <button
                            className={`btn ${actionType === 'approve' ? 'btn-success' : 'btn-danger'}`}
                            onClick={handleApproval}
                            disabled={!reason.trim() || (actionType === 'approve' && !rating)}
                          >
                            Confirm {actionType === 'approve' ? 'Approve' : 'Reject'}
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              setActionType(null)
                              setReason('')
                              setRating('')
                            }}
                          >
                            Back
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
