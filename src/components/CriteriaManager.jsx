import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

import {
  listCriteria,
  addCriteria,
  updateCriteria,
  deleteCriteria,
} from '../api/criteria'
import { canEditCycle } from '../utils/cyclePermissions'
import { useAuth } from '../auth/AuthContext'

export default function CriteriaManager({ cycle }) {
  const { user } = useAuth()
  const isDraft = cycle.status === 'DRAFT'
  const canEdit = user && canEditCycle(cycle, user.role)

  const [criteria, setCriteria] = useState([])
  const { register, handleSubmit, reset } = useForm()

  const loadCriteria = async () => {
    try {
      setCriteria(await listCriteria(cycle.id))
    } catch (err) {
      toast.error(err.message)
    }
  }

  useEffect(() => {
    loadCriteria()
  }, [cycle.id])

  const onAdd = async (data) => {
    try {
      await addCriteria(cycle.id, [
        {
          name: data.name,
          weight: Number(data.weight),
          description: data.description,
        },
      ])
      toast.success('Criteria added')
      reset()
      loadCriteria()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const toggleActive = async (c) => {
    try {
      await updateCriteria(c.id, { is_active: !c.is_active })
      loadCriteria()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="mt-4">
      <h5>Criteria</h5>

      {canEdit && (
        <form onSubmit={handleSubmit(onAdd)} className="card card-body mb-3">
          <input
            className="form-control mb-2"
            placeholder="Name"
            {...register('name', { required: true })}
          />
          <input
            type="number"
            step="0.01"
            className="form-control mb-2"
            placeholder="Weight (≤ 1.0)"
            {...register('weight', { required: true })}
          />
          <textarea
            className="form-control mb-2"
            placeholder="Description"
            {...register('description')}
          />
          <button className="btn btn-primary">Add Criteria</button>
        </form>
      )}

      <ul className="list-group">
        {criteria.map((c) => (
          <li key={c.id} className="list-group-item d-flex justify-content-between">
            <div>
              <strong>{c.name}</strong> ({c.weight})<br />
              <small>{c.description}</small>
            </div>
            {canEdit && (
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => toggleActive(c)}
              >
                {c.is_active ? 'Deactivate' : 'Activate'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
