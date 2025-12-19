import { useEffect, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import toast from 'react-hot-toast'
import { submitNomination } from '../api/nominations'
import { listUsers } from '../api/users'
import { useAuth } from '../auth/AuthContext'
import { handleError } from '../utils/errorHandler'
import AnswerInput from './AnswerInput'

export default function NominationForm({ cycle, criteria, onSubmitted }) {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [allowManualEntry, setAllowManualEntry] = useState(false)
  
  // Filter to only active criteria
  const activeCriteria = criteria.filter(c => c.is_active)
  
  const methods = useForm({
    defaultValues: {
      nominee_user_id: '',
      scores: activeCriteria.map(c => ({
        criteria_id: c.id,
        answer: {},
        score: null,
        comment: ''
      }))
    }
  })
  
  const { register, handleSubmit, reset } = methods

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const usersData = await listUsers()
      if (usersData && usersData.length > 0) {
        setUsers(usersData)
        setAllowManualEntry(false)
      } else {
        setAllowManualEntry(true)
      }
    } catch (err) {
      if (err.status === 403) {
        setAllowManualEntry(true)
      } else {
        console.error('Failed to load users:', err)
        setAllowManualEntry(true)
        if (err.status !== 403) {
          handleError('Failed to load users list. You can enter user ID manually.', 'Failed to load users list', 'nomination-form-users-load')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data) => {
    try {
      // Validate nominee is selected
      if (!data.nominee_user_id || !data.nominee_user_id.trim()) {
        toast.error('Please select a nominee')
        return
      }

      // Build scores array with answers based on criteria config
      const scores = activeCriteria.map((c, index) => {
        const scoreData = data.scores[index]
        const result = {
          criteria_id: c.id
        }

        const isRequired = c.config?.required !== false

        // If criteria has config (flexible system), use answer field
        if (c.config?.type) {
          const answer = scoreData.answer || {}
          
          // Build answer object based on question type
          const answerObj = {}
          
          if (c.config.type === 'text') {
            if (answer.text && answer.text.trim()) {
              answerObj.text = answer.text.trim()
            } else if (isRequired) {
              throw new Error(`Please provide an answer for "${c.name}"`)
            }
          } else if (c.config.type === 'single_select') {
            if (answer.selected) {
              answerObj.selected = answer.selected
            } else if (isRequired) {
              throw new Error(`Please select an option for "${c.name}"`)
            }
          } else if (c.config.type === 'multi_select') {
            if (answer.selected_list && Array.isArray(answer.selected_list) && answer.selected_list.length > 0) {
              answerObj.selected_list = answer.selected_list
            } else if (isRequired) {
              throw new Error(`Please select at least one option for "${c.name}"`)
            }
          } else if (c.config.type === 'text_with_image') {
            if (answer.text && answer.text.trim()) {
              answerObj.text = answer.text.trim()
            } else if (isRequired) {
              throw new Error(`Please provide an answer for "${c.name}"`)
            }
            if (answer.image_url && answer.image_url.trim()) {
              answerObj.image_url = answer.image_url.trim()
            }
          }
          
          // Only add answer if it has valid content (not empty object)
          if (Object.keys(answerObj).length > 0) {
            result.answer = answerObj
          } else if (isRequired) {
            throw new Error(`Please provide an answer for "${c.name}"`)
          }
        } else {
          // Legacy: use score and comment
          if (scoreData.score !== undefined && scoreData.score !== null && scoreData.score !== '') {
            result.score = Number(scoreData.score)
          } else if (isRequired) {
            throw new Error(`Please provide a score for "${c.name}"`)
          }
          if (scoreData.comment && scoreData.comment.trim()) {
            result.comment = scoreData.comment.trim()
          }
        }

        return result
      })

      // Filter out scores with no data (for optional criteria)
      const validScores = scores.filter(s => {
        return s.answer && Object.keys(s.answer).length > 0 || 
               (s.score !== undefined && s.score !== null) ||
               (s.comment && s.comment.trim())
      })

      if (validScores.length === 0) {
        toast.error('Please provide answers for at least one criterion')
        return
      }

      console.log('Submitting nomination:', {
        cycle_id: cycle.id,
        nominee_user_id: data.nominee_user_id,
        scores: validScores
      })

      await submitNomination({
        cycle_id: cycle.id,
        nominee_user_id: data.nominee_user_id,
        scores: validScores,
      })

      toast.success('Nomination submitted successfully')
      reset()
      if (onSubmitted) onSubmitted()
    } catch (err) {
      console.error('Nomination submission error:', err)
      handleError(err, 'Failed to submit nomination', `nomination-submit-${cycle.id}`)
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
    <FormProvider {...methods}>
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
                  .filter(u => u.status === 'ACTIVE' && u.role === 'EMPLOYEE')
                  .filter((user, index, self) => 
                    index === self.findIndex(u => u.email === user.email)
                  )
                  .map((userOption) => (
                    <option key={userOption.id} value={userOption.id}>
                      {userOption.name} ({userOption.email})
                    </option>
                  ))}
              </select>
              <div className="form-text">
                Showing {users.filter(u => u.status === 'ACTIVE' && u.role === 'EMPLOYEE').length} active employee(s)
              </div>
            </>
          )}
        </div>

        <hr />

        <h6>Criteria Answers</h6>
        <p className="text-muted small mb-3">
          Provide answers for each criterion. The input type depends on how HR configured each criterion.
        </p>

        {activeCriteria.length === 0 ? (
          <div className="alert alert-warning">
            No active criteria defined for this cycle. Please contact HR to add criteria.
          </div>
        ) : (
          activeCriteria.map((c, index) => {
            const config = c.config || {}
            const isRequired = config.required !== false
            
            return (
              <div key={c.id} className="mb-4 p-3 border rounded">
                <label className="form-label fw-bold">
                  {c.name} 
                  <span className="text-muted ms-2">(Weight: {c.weight})</span>
                  {isRequired && <span className="text-danger ms-1">*</span>}
                </label>
                {c.description && (
                  <p className="text-muted small mb-2">{c.description}</p>
                )}
                {config.type && (
                  <div className="mb-2">
                    <span className="badge bg-info">
                      {config.type === 'text' && 'Text Answer'}
                      {config.type === 'single_select' && 'Single Select'}
                      {config.type === 'multi_select' && 'Multi Select'}
                      {config.type === 'text_with_image' && 'Text with Image'}
                    </span>
                  </div>
                )}
                <AnswerInput 
                  criteria={c} 
                  fieldName={`scores.${index}`}
                />
              </div>
            )
          })
        )}

        <div className="mt-3">
          <button type="submit" className="btn btn-primary">
            Submit Nomination
          </button>
        </div>
      </form>
    </FormProvider>
  )
}
