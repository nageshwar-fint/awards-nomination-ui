import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

import { listCycles, deleteCycle } from '../api/cycles'
import { useAuth } from '../auth/AuthContext'
import CreateCycleForm from '../components/CreateCycleForm'
import {
  canCreateCycle,
  canDeleteCycle,
} from '../utils/cyclePermissions'

export default function Cycles() {
  const { user } = useAuth()

  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const loadCycles = async () => {
    setLoading(true)
    try {
      const data = await listCycles()
      setCycles(data)
    } catch (err) {
      toast.error(err.message || 'Failed to load cycles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCycles()
  }, [])

  const handleDelete = async (cycle) => {
    if (!window.confirm(`Delete cycle "${cycle.name}"?`)) return

    try {
      await deleteCycle(cycle.id)
      toast.success('Cycle deleted')
      loadCycles()
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    }
  }

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Nomination Cycles</h3>

        {user && canCreateCycle(user.role) && (
          <button
            className="btn btn-success"
            onClick={() => setShowCreate(true)}
          >
            Create Cycle
          </button>
        )}
      </div>

      {/* Create Cycle Form */}
      {showCreate && (
        <CreateCycleForm
          onCancel={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            loadCycles()
          }}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="alert alert-info">
          Loading cycles…
        </div>
      )}

      {/* Empty State */}
      {!loading && cycles.length === 0 && (
        <div className="alert alert-secondary">
          No nomination cycles found.
        </div>
      )}

      {/* Cycles Table */}
      {!loading && cycles.length > 0 && (
        <table className="table table-bordered mt-3">
          <thead className="table-light">
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Start</th>
              <th>End</th>
              <th style={{ width: '160px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((cycle) => (
              <tr key={cycle.id}>
                <td>{cycle.name}</td>
                <td>
                  <span className={`badge ${
                    cycle.status === 'DRAFT' ? 'bg-secondary' :
                    cycle.status === 'OPEN' ? 'bg-success' :
                    cycle.status === 'CLOSED' ? 'bg-warning' :
                    'bg-info'
                  }`}>
                    {cycle.status}
                  </span>
                </td>
                <td>
                  {cycle.start_at
                    ? new Date(cycle.start_at).toLocaleDateString()
                    : '-'}
                </td>
                <td>
                  {cycle.end_at
                    ? new Date(cycle.end_at).toLocaleDateString()
                    : '-'}
                </td>
                <td>
                  {/* View (always allowed) */}
                  <button
                    onClick={() => window.location.href = `/cycles/${cycle.id}`}
                    className="btn btn-sm btn-outline-primary me-2"
                  >
                    View
                  </button>

                  {/* Delete (DRAFT + TeamLead+) */}
                  {user &&
                    canDeleteCycle(cycle, user.role) && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(cycle)}
                      >
                        Delete
                      </button>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
