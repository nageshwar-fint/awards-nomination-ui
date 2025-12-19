import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

import {
  listCriteria,
  addCriteria,
  updateCriteria,
  deleteCriteria,
} from '../api/criteria'
import { canManageCriteria } from '../utils/cyclePermissions'
import { useAuth } from '../auth/AuthContext'
import { handleError } from '../utils/errorHandler'
import { FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi'

const QUESTION_TYPES = [
  { value: 'text', label: 'Text Answer' },
  { value: 'single_select', label: 'Single Select' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'text_with_image', label: 'Text with Image' },
]

export default function CriteriaManager({ cycle }) {
  const { user } = useAuth()
  const isDraft = cycle.status === 'DRAFT'
  const canEdit = user && canManageCriteria(cycle, user.role)
  const [criteria, setCriteria] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  
  // Debug logging
  useEffect(() => {
    console.log('CriteriaManager - Permissions:', {
      userRole: user?.role,
      cycleStatus: cycle?.status,
      isDraft,
      canEdit,
      canManageCriteria: user ? canManageCriteria(cycle, user.role) : false
    })
  }, [user, cycle, isDraft, canEdit])
  
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      question_type: 'text',
      required: true,
      image_required: false
    }
  })
  
  const questionType = watch('question_type')

  const loadCriteria = async () => {
    try {
      // HR should see all criteria (active and inactive) for management
      const allCriteria = await listCriteria(cycle.id, false)
      setCriteria(allCriteria)
      console.log('Loaded criteria:', allCriteria)
    } catch (err) {
      console.error('Failed to load criteria:', err)
      handleError(err, 'Failed to load criteria', `criteria-load-${cycle.id}`)
    }
  }

  useEffect(() => {
    loadCriteria()
  }, [cycle.id])

  const onAdd = async (data) => {
    try {
      // Check if cycle is in DRAFT status
      if (cycle.status !== 'DRAFT') {
        toast.error(`Cannot add criteria. Cycle must be in DRAFT status. Current status: ${cycle.status}`)
        return
      }
      
      // Convert is_active from string to boolean
      const isActive = data.is_active === 'true' || data.is_active === true || data.is_active === undefined
      
      // Validate required fields first
      if (!data.name || !data.name.trim()) {
        toast.error('Name is required')
        return
      }
      
      if (data.weight === undefined || data.weight === null || data.weight === '') {
        toast.error('Weight is required')
        return
      }
      
      const weight = Number(data.weight)
      if (isNaN(weight)) {
        toast.error('Weight must be a valid number')
        return
      }
      
      if (weight < 0 || weight > 10) {
        toast.error('Weight must be between 0 and 10')
        return
      }
      
      // Handle description - empty string should be null
      const description = data.description && data.description.trim() ? data.description.trim() : null
      
      const criteriaData = {
        name: data.name.trim(),
        weight: weight,
        description: description,
        is_active: isActive,
      }

      // Add config if question type is specified
      if (data.question_type && data.question_type !== 'legacy') {
        criteriaData.config = {
          type: data.question_type,
          required: data.required !== false,
        }

        // Add options for select types
        if (data.question_type === 'single_select' || data.question_type === 'multi_select') {
          const options = data.options
            ? data.options.split('\n').filter(o => o.trim()).map(o => o.trim())
            : []
          if (options.length === 0) {
            toast.error('Please provide at least one option for select types')
            return
          }
          criteriaData.config.options = options
        }

        // Add image_required for text_with_image type
        if (data.question_type === 'text_with_image') {
          criteriaData.config.image_required = data.image_required === true
        }
      }

      console.log('Submitting criteria:', criteriaData)
      console.log('Cycle ID:', cycle.id)
      
      const result = await addCriteria(cycle.id, [criteriaData])
      console.log('Criteria added successfully:', result)
      
      toast.success('Criteria added successfully')
      reset()
      setShowAddForm(false)
      loadCriteria()
    } catch (err) {
      console.error('Error adding criteria:', err)
      console.error('Error details:', {
        message: err.message,
        status: err.status,
        data: err.data
      })
      handleError(err, 'Failed to add criteria', `criteria-add-${cycle.id}`)
    }
  }

  const onUpdate = async (criteriaId, data) => {
    try {
      await updateCriteria(criteriaId, data)
      toast.success('Criteria updated successfully')
      setEditingId(null)
      loadCriteria()
    } catch (err) {
      handleError(err, 'Failed to update criteria', `criteria-update-${criteriaId}`)
    }
  }

  const onDelete = async (criteriaId) => {
    if (!window.confirm('Delete this criteria? This action cannot be undone if nominations have been submitted.')) return
    
    try {
      await deleteCriteria(criteriaId)
      toast.success('Criteria deleted successfully')
      loadCriteria()
    } catch (err) {
      handleError(err, 'Failed to delete criteria', `criteria-delete-${criteriaId}`)
    }
  }

  const toggleActive = async (c) => {
    try {
      await updateCriteria(c.id, { is_active: !c.is_active })
      loadCriteria()
    } catch (err) {
      handleError(err, 'Failed to update criteria', `criteria-update-${c.id}`)
    }
  }

  const startEdit = (c) => {
    setEditingId(c.id)
    setValue('name', c.name)
    setValue('weight', c.weight)
    setValue('description', c.description || '')
    setValue('question_type', c.config?.type || 'legacy')
    setValue('required', c.config?.required !== false)
    setValue('image_required', c.config?.image_required === true)
    if (c.config?.options) {
      setValue('options', c.config.options.join('\n'))
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    reset()
  }

  return (
    <div className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Criteria</h5>
        {canEdit && isDraft && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <FiPlus className="me-1" />
            {showAddForm ? 'Cancel' : 'Add Criteria'}
          </button>
        )}
      </div>

      {!canEdit && user && (
        <div className="alert alert-info">
          {user.role !== 'HR' ? (
            <>Only HR can manage criteria. Your role: {user.role}</>
          ) : (
            <>Criteria can only be managed for DRAFT cycles. Current status: {cycle.status}. Please change the cycle status to DRAFT to add criteria.</>
          )}
        </div>
      )}

      {canEdit && !isDraft && (
        <div className="alert alert-warning">
          Criteria can only be managed for DRAFT cycles. Current status: {cycle.status}
        </div>
      )}

      {!user && (
        <div className="alert alert-warning">
          Please log in to view criteria.
        </div>
      )}

      {showAddForm && canEdit && isDraft && (
        <form onSubmit={handleSubmit(onAdd)} className="card card-body mb-3">
          <h6>Add New Criteria</h6>
          
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Name *</label>
              <input
                className="form-control"
                placeholder="e.g., Leadership, Technical Excellence"
                {...register('name', { required: true })}
              />
            </div>
            <div className="col-md-3 mb-3">
              <label className="form-label">Weight *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                className="form-control"
                placeholder="0.00 - 10.00"
                {...register('weight', { required: true, min: 0, max: 10 })}
              />
            </div>
            <div className="col-md-3 mb-3">
              <label className="form-label">Active</label>
              <select className="form-select" {...register('is_active', { valueAsBoolean: false })}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows="2"
              placeholder="Optional description"
              {...register('description')}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Question Type *</label>
            <select
              className="form-select"
              {...register('question_type')}
            >
              <option value="text">Text Answer</option>
              <option value="single_select">Single Select</option>
              <option value="multi_select">Multi Select</option>
              <option value="text_with_image">Text with Image</option>
            </select>
            <small className="form-text text-muted">
              Choose how team leads will answer this criteria
            </small>
          </div>

          {(questionType === 'single_select' || questionType === 'multi_select') && (
            <div className="mb-3">
              <label className="form-label">Options (one per line) *</label>
              <textarea
                className="form-control"
                rows="4"
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                {...register('options', { 
                  required: questionType === 'single_select' || questionType === 'multi_select'
                })}
              />
              <small className="form-text text-muted">
                Enter one option per line. These will be shown as selectable options.
              </small>
            </div>
          )}

          <div className="row">
            <div className="col-md-6 mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  defaultChecked
                  {...register('required')}
                />
                <label className="form-check-label">
                  Required field
                </label>
              </div>
            </div>
            {questionType === 'text_with_image' && (
              <div className="col-md-6 mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    {...register('image_required')}
                  />
                  <label className="form-check-label">
                    Image required
                  </label>
                </div>
              </div>
            )}
          </div>

          <div>
            <button type="submit" className="btn btn-primary me-2">
              Add Criteria
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowAddForm(false)
                reset()
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {criteria.length === 0 ? (
        <div className="alert alert-secondary">
          No criteria defined for this cycle. {canEdit && isDraft && 'Add criteria to get started.'}
        </div>
      ) : (
        <div className="list-group">
          {criteria.map((c) => (
            <div key={c.id} className="list-group-item">
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <strong>{c.name}</strong>
                    <span className="badge bg-secondary">Weight: {c.weight}</span>
                    {c.is_active ? (
                      <span className="badge bg-success">Active</span>
                    ) : (
                      <span className="badge bg-secondary">Inactive</span>
                    )}
                    {c.config?.type && (
                      <span className="badge bg-info">
                        {QUESTION_TYPES.find(t => t.value === c.config.type)?.label || c.config.type}
                      </span>
                    )}
                  </div>
                  {c.description && (
                    <p className="text-muted small mb-2">{c.description}</p>
                  )}
                  {c.config && (
                    <div className="small text-muted">
                      <strong>Question Type:</strong> {c.config.type}
                      {c.config.required !== false && <span className="ms-2">• Required</span>}
                      {c.config.options && (
                        <div className="mt-1">
                          <strong>Options:</strong> {c.config.options.join(', ')}
                        </div>
                      )}
                      {c.config.image_required && (
                        <span className="ms-2">• Image Required</span>
                      )}
                    </div>
                  )}
                </div>
                {canEdit && isDraft && (
                  <div className="btn-group">
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => toggleActive(c)}
                      title={c.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {c.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onDelete(c.id)}
                      title="Delete"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
