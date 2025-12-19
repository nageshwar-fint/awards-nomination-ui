import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { createUser } from '../../api/admin'
import toast from 'react-hot-toast'
import { ROLES } from '../../constants/roles'
import { handleError } from '../../utils/errorHandler'
import { FiArrowLeft, FiUserPlus } from 'react-icons/fi'

export default function AdminUserCreate() {
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors }, watch } = useForm()
  const [saving, setSaving] = useState(false)
  const password = watch('password')

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      await createUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        team_id: data.team_id || null,
        status: data.status || 'ACTIVE'
      })
      toast.success('User created successfully')
      navigate('/admin/users')
    } catch (err) {
      handleError(err, 'Failed to create user', 'user-create')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-users-container">
      <div className="admin-users-header">
        <div>
          <h1 className="admin-users-title">Create New User</h1>
          <p className="admin-users-subtitle">
            Create a new user account with password and role assignment
          </p>
        </div>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate('/admin/users')}
        >
          <FiArrowLeft className="me-2" />
          Back to Users
        </button>
      </div>

      <div className="admin-card">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                placeholder="Full name"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && (
                <div className="invalid-feedback">{errors.name.message}</div>
              )}
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Email *</label>
              <input
                type="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                placeholder="user@example.com"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Invalid email format'
                  }
                })}
              />
              {errors.email && (
                <div className="invalid-feedback">{errors.email.message}</div>
              )}
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Password *</label>
              <input
                type="password"
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                placeholder="Minimum 8 characters"
                {...register('password', { 
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters'
                  }
                })}
              />
              {errors.password && (
                <div className="invalid-feedback">{errors.password.message}</div>
              )}
              <small className="form-text text-muted">
                Password must be at least 8 characters long
              </small>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Confirm Password *</label>
              <input
                type="password"
                className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                placeholder="Re-enter password"
                {...register('confirmPassword', { 
                  required: 'Please confirm password',
                  validate: value => value === password || 'Passwords do not match'
                })}
              />
              {errors.confirmPassword && (
                <div className="invalid-feedback">{errors.confirmPassword.message}</div>
              )}
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Role *</label>
              <select
                className={`form-select ${errors.role ? 'is-invalid' : ''}`}
                {...register('role', { required: 'Role is required' })}
              >
                <option value="">Select a role...</option>
                <option value={ROLES.EMPLOYEE}>EMPLOYEE - Read-only access</option>
                <option value={ROLES.TEAM_LEAD}>TEAM_LEAD - Can submit nominations</option>
                <option value={ROLES.MANAGER}>MANAGER - Can approve and compute rankings</option>
                <option value={ROLES.HR}>HR - Full system access</option>
              </select>
              {errors.role && (
                <div className="invalid-feedback">{errors.role.message}</div>
              )}
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                {...register('status')}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
              <small className="form-text text-muted">
                Default: ACTIVE
              </small>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Team ID (Optional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter team UUID or leave empty"
              {...register('team_id')}
            />
            <small className="form-text text-muted">
              Optional: Enter team UUID if user belongs to a team
            </small>
          </div>

          <div className="alert alert-info">
            <strong>Note:</strong> HR can assign any role including HR (admin) role. 
            The user will be able to login immediately after creation if status is ACTIVE.
          </div>

          <div className="mt-4">
            <button
              type="submit"
              className="btn btn-primary me-2"
              disabled={saving}
            >
              <FiUserPlus className="me-2" />
              {saving ? 'Creating...' : 'Create User'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/admin/users')}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
