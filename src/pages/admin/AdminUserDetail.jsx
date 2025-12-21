import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getUser, updateUser } from '../../api/admin'
import { listTeams } from '../../api/teams'
import toast from 'react-hot-toast'
import { ROLES } from '../../constants/roles'
import { handleError } from '../../utils/errorHandler'

export default function AdminUserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [teams, setTeams] = useState([])
  const [loadingTeams, setLoadingTeams] = useState(true)

  useEffect(() => {
    loadUser()
    loadTeams()
  }, [id])

  const loadUser = async () => {
    setLoading(true)
    try {
      const userData = await getUser(id)
      setUser(userData)
    } catch (err) {
      handleError(err, 'Failed to load user', `user-load-${id}`)
      navigate('/admin/users')
    } finally {
      setLoading(false)
    }
  }

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

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      // Prepare update data - only send changed fields
      const updateData = {
        name: user.name,
        role: user.role,
        status: user.status,
        team_id: user.team_id || null,
      }

      await updateUser(id, updateData)
      toast.success('User updated successfully')
      navigate('/admin/users')
    } catch (err) {
      handleError(err, 'Failed to update user', `user-update-${id}`)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigate('/admin/users')
  }

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="alert alert-info">Loading user details...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">User not found</div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>User Details</h3>
        <button
          className="btn btn-outline-secondary"
          onClick={handleCancel}
        >
          Back to Users
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="form-control"
                value={user.name || ''}
                onChange={e =>
                  setUser({ ...user, name: e.target.value })
                }
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={user.email || ''}
                disabled
                title="Email cannot be changed"
              />
              <small className="text-muted">Email cannot be changed</small>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Role *</label>
              <select
                className="form-select"
                value={user.role || ''}
                onChange={e =>
                  setUser({ ...user, role: e.target.value })
                }
              >
                <option value={ROLES.EMPLOYEE}>EMPLOYEE</option>
                <option value={ROLES.TEAM_LEAD}>TEAM_LEAD</option>
                <option value={ROLES.MANAGER}>MANAGER</option>
                <option value={ROLES.HR}>HR</option>
              </select>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Status *</label>
              <select
                className="form-select"
                value={user.status || ''}
                onChange={e =>
                  setUser({ ...user, status: e.target.value })
                }
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Department</label>
            {loadingTeams ? (
              <div className="form-control">
                <small className="text-muted">Loading departments...</small>
              </div>
            ) : (
              <select
                className="form-select"
                value={user.team_id || ''}
                onChange={e =>
                  setUser({ ...user, team_id: e.target.value || null })
                }
              >
                <option value="">No department (leave empty)</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            )}
            <small className="text-muted">Optional: Select a department if user belongs to a department</small>
          </div>

          <div className="mt-4">
            <button
              className="btn btn-success me-2"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
