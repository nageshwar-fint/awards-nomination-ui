import { useEffect, useState } from 'react'
import { listUsers, deleteUser, activateUser } from '../../api/admin'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch((err) => {
        toast.error(err.message || 'Failed to load users')
      })
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return
    
    try {
      await deleteUser(id)
      toast.success('User deleted')
      setUsers(users.filter(u => u.id !== id))
    } catch (err) {
      toast.error(err.message || 'Failed to delete user')
    }
  }

  const handleActivate = async (id) => {
    try {
      await activateUser(id)
      toast.success('User activated')
      setUsers(users.map(u =>
        u.id === id ? { ...u, status: 'ACTIVE' } : u
      ))
    } catch (err) {
      toast.error(err.message || 'Failed to activate user')
    }
  }

  return (
    <div className="container mt-4">
      <h3>Admin – Users</h3>

      <table className="table mt-3">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.status}</td>
              <td>
                <Link
                  className="btn btn-sm btn-primary me-2"
                  to={`/admin/users/${user.id}`}
                >
                  View
                </Link>

                {user.status !== 'ACTIVE' && (
                  <button
                    className="btn btn-sm btn-success me-2"
                    onClick={() => handleActivate(user.id)}
                  >
                    Activate
                  </button>
                )}

                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(user.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
