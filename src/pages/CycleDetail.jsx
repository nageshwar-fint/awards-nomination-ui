import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { getCycle, updateCycle } from '../api/cycles'
import { listCriteria } from '../api/criteria'
import { listNominations } from '../api/nominations'
import { listUsers } from '../api/users'
import CriteriaManager from '../components/CriteriaManager'
import NominationForm from '../components/NominationForm'
import RankingsPanel from '../components/RankingsPanel'
import { useAuth } from '../auth/AuthContext'
import { canEditCycle, canSubmitNomination } from '../utils/cyclePermissions'
import { getCycleStatusBadgeClass, getNominationStatusBadgeClass } from '../utils/statusBadges'
import { formatDateTime, formatDateForInput } from '../utils/dateUtils'
import { handleError } from '../utils/errorHandler'

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
    </div>
  )
}
