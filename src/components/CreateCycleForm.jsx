import { useForm } from 'react-hook-form'
import { createCycle } from '../api/cycles'
import toast from 'react-hot-toast'
import { handleError } from '../utils/errorHandler'

export default function CreateCycleForm({ onCreated, onCancel }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    try {
      // Convert date to ISO string (set start date to beginning of day, end date to end of day)
      const startDate = new Date(data.start_at)
      startDate.setHours(0, 0, 0, 0) // Start of day
      
      const endDate = new Date(data.end_at)
      endDate.setHours(23, 59, 59, 999) // End of day

      // Validate dates
      if (endDate <= startDate) {
        handleError('End date must be after start date', 'End date must be after start date', 'cycle-date-validation')
        return
      }

      const cycleData = {
        name: data.name,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString()
      }

      await createCycle(cycleData)
      toast.success('Cycle created successfully')
      reset()
      onCreated()
    } catch (err) {
      handleError(err, 'Failed to create cycle', 'cycle-create')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card card-body mt-3">
      <h5>Create New Cycle</h5>

      <div className="mb-2">
        <label className="form-label">Cycle Name *</label>
        <input
          className={`form-control ${errors.name ? 'is-invalid' : ''}`}
          placeholder="e.g., Q1 2024 Awards"
          {...register('name', { required: 'Cycle name is required' })}
        />
        {errors.name && (
          <div className="invalid-feedback">{errors.name.message}</div>
        )}
      </div>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label">Start Date *</label>
          <input
            type="date"
            className={`form-control ${errors.start_at ? 'is-invalid' : ''}`}
            {...register('start_at', { required: 'Start date is required' })}
          />
          {errors.start_at && (
            <div className="invalid-feedback">{errors.start_at.message}</div>
          )}
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">End Date *</label>
          <input
            type="date"
            className={`form-control ${errors.end_at ? 'is-invalid' : ''}`}
            {...register('end_at', { required: 'End date is required' })}
          />
          {errors.end_at && (
            <div className="invalid-feedback">{errors.end_at.message}</div>
          )}
        </div>
      </div>

      <div className="alert alert-info small mb-3">
        <strong>Note:</strong> The cycle will be created in DRAFT status. You can add criteria and then open it for nominations.
      </div>

      <div>
        <button type="submit" className="btn btn-primary me-2">
          Create Cycle
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
