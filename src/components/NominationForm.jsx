import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { submitNomination } from '../api/nominations'
import { listUsers } from '../api/admin'
import { listNominations } from '../api/nominations'
import { useAuth } from '../auth/AuthContext'

export default function NominationForm({ cycle, criteria, onSubmitted }) {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [allowManualEntry, setAllowManualEntry] = useState(false)
  const { register, handleSubmit, reset, watch } = useForm()
  const nomineeUserId = watch('nominee_user_id')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      // Try to load users from admin endpoint (requires HR role)
      const usersData = await listUsers()
      if (usersData && usersData.length > 0) {
        setUsers(usersData)
        setAllowManualEntry(false)
      } else {
        setAllowManualEntry(true)
      }
    } catch (err) {
      // If 403 Forbidden, user doesn't have HR role
      if (err.status === 403) {
        setAllowManualEntry(true)
        // Don't show error toast, just allow manual entry
      } else {
        console.error('Failed to load users:', err)
        setAllowManualEntry(true)
        // Only show error for non-403 errors
        if (err.status !== 403) {
          toast.error('Failed to load users list. You can enter user ID manually.')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data) => {
    try {
      const scores = criteria.map((c) => ({
        criteria_id: c.id,
        score: Number(data[`score_${c.id}`]),
        comment: data[`comment_${c.id}`] || undefined
      }))

      await submitNomination({
        cycle_id: cycle.id,
        nominee_user_id: data.nominee_user_id,
        scores,
      })

      toast.success('Nomination submitted successfully')
      reset()
      if (onSubmitted) onSubmitted()
    } catch (err) {
      toast.error(err.message || 'Failed to submit nomination')
    }
  }

  if (loading) {
    return (
      <div className="card card-body mt-3">
        <div className="alert alert-info">Loading users...</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card card-body mt-3">
      <h5>Submit Nomination</h5>

      <div className="mb-3">
        <label className="form-label">Nominee *</label>
        {allowManualEntry || users.length === 0 ? (
          <div>
            <input
              type="text"
              className="form-control"
              placeholder="Enter nominee user ID (UUID)"
              {...register('nominee_user_id', { 
                required: 'Nominee user ID is required',
                pattern: {
                  value: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
                  message: 'Please enter a valid UUID format'
                }
              })}
            />
            <div className="form-text">
              {user?.role !== 'HR' ? (
                <>
                  <strong>Note:</strong> Users list requires HR access. Please enter the user ID (UUID) of the person you want to nominate.
                  <br />
                  You can find user IDs from existing nominations or contact HR for assistance.
                </>
              ) : (
                'Enter the UUID of the user you want to nominate'
              )}
            </div>
          </div>
        ) : (
          <>
            <select
              className="form-select"
              {...register('nominee_user_id', { required: 'Please select a nominee' })}
            >
              <option value="">Select a nominee...</option>
              {users
                .filter(u => u.status === 'ACTIVE') // Only show active users
                .map((userOption) => (
                  <option key={userOption.id} value={userOption.id}>
                    {userOption.name} ({userOption.email}) - {userOption.role}
                  </option>
                ))}
            </select>
            <div className="form-text">
              Showing {users.filter(u => u.status === 'ACTIVE').length} active user(s)
            </div>
          </>
        )}
      </div>

      <hr />

      <h6>Scores</h6>
      <p className="text-muted small">
        Provide scores for each criterion (typically 1-10 scale)
      </p>

      {criteria.map((c) => (
        <div key={c.id} className="mb-3">
          <label className="form-label">
            {c.name} (Weight: {c.weight})
            {c.description && (
              <small className="text-muted d-block">{c.description}</small>
            )}
          </label>
          <div className="row">
            <div className="col-md-3">
              <input
                type="number"
                min="1"
                max="10"
                step="1"
                className="form-control"
                placeholder="Score (1-10)"
                {...register(`score_${c.id}`, {
                  required: true,
                  min: 1,
                  max: 10,
                  valueAsNumber: true
                })}
              />
            </div>
            <div className="col-md-9">
              <input
                type="text"
                className="form-control"
                placeholder="Comment (optional)"
                {...register(`comment_${c.id}`)}
              />
            </div>
          </div>
        </div>
      ))}

      <div className="mt-3">
        <button type="submit" className="btn btn-primary">
          Submit Nomination
        </button>
      </div>
    </form>
  )
}
