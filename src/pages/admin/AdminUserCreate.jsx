import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { createUser, createUsersBulk } from '../../api/admin'
import { listTeams } from '../../api/teams'
import toast from 'react-hot-toast'
import { ROLES } from '../../constants/roles'
import { handleError } from '../../utils/errorHandler'
import { FiArrowLeft, FiUserPlus, FiUpload, FiX } from 'react-icons/fi'

export default function AdminUserCreate() {
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors }, watch } = useForm()
  const [saving, setSaving] = useState(false)
  const [teams, setTeams] = useState([])
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState(null)
  const password = watch('password')

  useEffect(() => {
    loadTeams()
  }, [])

  const loadTeams = async () => {
    setLoadingTeams(true)
    try {
      const teamsData = await listTeams()
      setTeams(teamsData || [])
    } catch (err) {
      console.error('Failed to load teams:', err)
      // Don't show error - teams are optional
    } finally {
      setLoadingTeams(false)
    }
  }

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      await createUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        team_id: data.team_id && data.team_id !== '' ? data.team_id : null,
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

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please upload an Excel file (.xlsx or .xls)')
      e.target.value = ''
      return
    }

    // Check if user is authenticated
    const token = localStorage.getItem('jwt_token')
    if (!token) {
      toast.error('You must be logged in to upload users')
      e.target.value = ''
      return
    }

    setUploading(true)
    setUploadResults(null)
    
    try {
      const results = await createUsersBulk(file)
      setUploadResults(results)
      
      if (results.summary.created > 0) {
        toast.success(`Successfully created ${results.summary.created} user(s)`)
      }
      if (results.summary.failed > 0) {
        toast.error(`${results.summary.failed} user(s) failed to create. Check details below.`)
      }
      if (results.summary.skipped > 0) {
        toast.error(`${results.summary.skipped} user(s) skipped (duplicate emails)`)
      }
    } catch (err) {
      // Check if it's an authentication error
      if (err.status === 401) {
        toast.error('Your session has expired. Please login again.')
        // The apiRequest should handle logout automatically, but just in case
        localStorage.removeItem('jwt_token')
        window.location.href = '/login'
      } else {
        handleError(err, 'Failed to upload users', 'bulk-upload')
      }
      e.target.value = ''
    } finally {
      setUploading(false)
      e.target.value = '' // Reset file input
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
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-primary"
            onClick={() => setShowBulkUpload(!showBulkUpload)}
            disabled={saving || uploading}
          >
            <FiUpload className="me-2" />
            Bulk Users
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate('/admin/users')}
          >
            <FiArrowLeft className="me-2" />
            Back to Users
          </button>
        </div>
      </div>

      {/* Bulk Upload Section */}
      {showBulkUpload && (
        <div className="admin-card mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="mb-1">Bulk User Creation</h5>
              <p className="text-muted small mb-0">
                Upload an Excel file to create multiple users at once
              </p>
            </div>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setShowBulkUpload(false)
                setUploadResults(null)
              }}
            >
              <FiX />
            </button>
          </div>

          <div className="mb-3">
            <label className="form-label">Excel File</label>
            <input
              type="file"
              className="form-control"
              accept=".xlsx,.xls"
              onChange={handleBulkUpload}
              disabled={uploading}
            />
            <small className="form-text text-muted">
              Required columns: Name, Email, Password, Role<br />
              Optional columns: Status, Department<br />
              Status defaults to ACTIVE if not provided
            </small>
          </div>

          {uploading && (
            <div className="alert alert-info">
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              Processing Excel file...
            </div>
          )}

          {uploadResults && (
            <div className="mt-3">
              <div className="alert alert-info">
                <strong>Summary:</strong> {uploadResults.summary.total} total,{' '}
                <span className="text-success">{uploadResults.summary.created} created</span>,{' '}
                <span className="text-danger">{uploadResults.summary.failed} failed</span>
                {uploadResults.summary.skipped > 0 && (
                  <>, <span className="text-warning">{uploadResults.summary.skipped} skipped (duplicates)</span></>
                )}
              </div>

              {uploadResults.success.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-success">Successfully Created ({uploadResults.success.length})</h6>
                  <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <table className="table table-sm table-bordered">
                      <thead className="table-light">
                        <tr>
                          <th>Row</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Department</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadResults.success.map((user, idx) => (
                          <tr key={idx}>
                            <td>{user.row}</td>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>{user.role}</td>
                            <td>{user.status}</td>
                            <td>{user.team_name || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {uploadResults.failed.length > 0 && (
                <div>
                  <h6 className="text-danger">Failed ({uploadResults.failed.length})</h6>
                  <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table className="table table-sm table-bordered">
                      <thead className="table-light">
                        <tr>
                          <th>Row</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Errors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadResults.failed.map((failure, idx) => (
                          <tr key={idx} className="table-danger">
                            <td>{failure.row}</td>
                            <td>{failure.name}</td>
                            <td>{failure.email}</td>
                            <td>
                              <ul className="mb-0 small">
                                {failure.errors.map((error, errIdx) => (
                                  <li key={errIdx}>{error}</li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {uploadResults.summary.created > 0 && (
                <div className="mt-3">
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate('/admin/users')}
                  >
                    View All Users
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
            <label className="form-label">Department (Optional)</label>
            {loadingTeams ? (
              <div className="form-control">
                <small className="text-muted">Loading departments...</small>
              </div>
            ) : (
              <select
                className="form-select"
                {...register('team_id')}
              >
                <option value="">No department (leave empty)</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            )}
            <small className="form-text text-muted">
              Optional: Select a department if user belongs to a department. You can also leave empty.
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
