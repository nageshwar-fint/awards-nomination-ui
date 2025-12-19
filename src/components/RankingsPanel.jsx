import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getRankings, computeRankings, finalizeCycle } from '../api/rankings'
import { listUsers } from '../api/users'
import { useAuth } from '../auth/AuthContext'
import { canComputeRankings, canFinalize } from '../utils/cyclePermissions'
import { formatDateTime } from '../utils/dateUtils'
import { handleError } from '../utils/errorHandler'

export default function RankingsPanel({ cycle, onFinalized }) {
  const { user } = useAuth()
  const [rankings, setRankings] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)

  useEffect(() => {
    loadData()
  }, [cycle.id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [rankingsData, usersData] = await Promise.all([
        getRankings(cycle.id).catch(() => []),
        listUsers().catch(() => [])
      ])
      setRankings(rankingsData)
      setUsers(usersData)
    } catch (err) {
      handleError(err, 'Failed to load rankings', `rankings-load-${cycle.id}`)
    } finally {
      setLoading(false)
    }
  }

  const handleComputeRankings = async () => {
    if (!window.confirm('Compute rankings for this cycle? This will recalculate all rankings based on approved nominations.')) {
      return
    }

    setComputing(true)
    try {
      await computeRankings(cycle.id)
      toast.success('Rankings computed successfully')
      loadData()
    } catch (err) {
      handleError(err, 'Failed to compute rankings', `rankings-compute-${cycle.id}`)
    } finally {
      setComputing(false)
    }
  }

  const handleFinalize = async () => {
    if (!window.confirm('Finalize this cycle? This action cannot be undone. The cycle will be locked and historical snapshots will be created.')) {
      return
    }

    try {
      await finalizeCycle(cycle.id)
      toast.success('Cycle finalized successfully')
      if (onFinalized) {
        onFinalized()
      }
      // Reload to get updated cycle status
      window.location.reload()
    } catch (err) {
      handleError(err, 'Failed to finalize cycle', `cycle-finalize-${cycle.id}`)
    }
  }

  const getUserName = (userId) => {
    const foundUser = users.find(u => u.id === userId)
    return foundUser ? foundUser.name : userId
  }

  const canCompute = user && canComputeRankings(cycle, user.role)
  const canFinalizeCycle = user && canFinalize(cycle, user.role) // HR only

  if (loading) {
    return (
      <div className="mt-4">
        <div className="alert alert-info">Loading rankings...</div>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Rankings</h5>
        {canCompute && (
          <div>
            <button
              className="btn btn-warning me-2"
              onClick={handleComputeRankings}
              disabled={computing}
            >
              {computing ? 'Computing...' : 'Compute Rankings'}
            </button>
            {canFinalizeCycle && cycle.status === 'CLOSED' && (
              <button
                className="btn btn-danger"
                onClick={handleFinalize}
                title="HR only - Finalize cycle (irreversible)"
              >
                Finalize Cycle
              </button>
            )}
          </div>
        )}
      </div>

      {rankings.length === 0 ? (
        <div className="alert alert-secondary">
          No rankings available. {canCompute && 'Compute rankings to see results.'}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead className="table-light">
              <tr>
                <th style={{ width: '80px' }}>Rank</th>
                <th>Nominee</th>
                <th>Total Score</th>
                <th>Computed At</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((ranking) => (
                <tr key={ranking.id}>
                  <td>
                    <strong className="badge bg-primary" style={{ fontSize: '1.1em' }}>
                      #{ranking.rank}
                    </strong>
                  </td>
                  <td>{getUserName(ranking.nominee_user_id)}</td>
                  <td>
                    <strong>{ranking.total_score.toFixed(2)}</strong>
                  </td>
                  <td>{formatDateTime(ranking.computed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

