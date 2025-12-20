import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { uploadImage } from '../api/uploads'
import toast from 'react-hot-toast'

/**
 * Component that renders the appropriate input based on criteria config type
 */
export default function AnswerInput({ criteria, fieldName }) {
  const { register, watch, setValue } = useFormContext()
  const config = criteria.config || {}
  const questionType = config.type || 'legacy'
  const isRequired = config.required !== false
  const imageRequired = config.image_required === true

  // For legacy criteria (no config), use score input
  if (!config.type) {
    return (
      <div className="row">
        <div className="col-md-3">
          <input
            type="number"
            min="1"
            max="10"
            step="1"
            className="form-control"
            placeholder="Score (1-10)"
            {...register(`${fieldName}.score`, {
              required: isRequired,
              min: 1,
              max: 10,
              valueAsNumber: true
            })}
          />
        </div>
        <div className="col-md-9">
          <input
            type="text"
            className="form-control"
            placeholder="Comment (optional)"
            {...register(`${fieldName}.comment`)}
          />
        </div>
      </div>
    )
  }

  // Text type
  if (questionType === 'text') {
    return (
      <textarea
        className="form-control"
        rows="4"
        placeholder="Enter your answer..."
        {...register(`${fieldName}.answer.text`, {
          required: isRequired ? 'This field is required' : false
        })}
      />
    )
  }

  // Single select type
  if (questionType === 'single_select') {
    return (
      <select
        className="form-select"
        {...register(`${fieldName}.answer.selected`, {
          required: isRequired ? 'Please select an option' : false
        })}
      >
        <option value="">Select an option...</option>
        {config.options?.map((option, idx) => (
          <option key={idx} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  }

  // Multi select type
  if (questionType === 'multi_select') {
    const selectedValues = watch(`${fieldName}.answer.selected_list`) || []
    
    return (
      <div>
        {config.options?.map((option, idx) => {
          const isChecked = selectedValues.includes(option)
          return (
            <div key={idx} className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  const current = watch(`${fieldName}.answer.selected_list`) || []
                  if (e.target.checked) {
                    setValue(`${fieldName}.answer.selected_list`, [...current, option])
                  } else {
                    setValue(`${fieldName}.answer.selected_list`, current.filter(v => v !== option))
                  }
                }}
              />
              <label className="form-check-label">
                {option}
              </label>
            </div>
          )
        })}
        {isRequired && selectedValues.length === 0 && (
          <div className="text-danger small mt-1">Please select at least one option</div>
        )}
      </div>
    )
  }

  // Text with image type
  if (questionType === 'text_with_image') {
    const imageUrl = watch(`${fieldName}.answer.image_url`)
    const [uploading, setUploading] = useState(false)
    const [uploadedFile, setUploadedFile] = useState(null)
    
    const handleFileChange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!validTypes.includes(file.type)) {
        toast.error('Please select a valid image file (JPG, PNG, GIF, or WEBP)')
        e.target.value = ''
        return
      }
      
      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        toast.error('Image size must be less than 10MB')
        e.target.value = ''
        return
      }
      
      setUploading(true)
      try {
        const result = await uploadImage(file)
        setValue(`${fieldName}.answer.image_url`, result.url)
        setUploadedFile(file)
        toast.success('Image uploaded successfully')
      } catch (err) {
        toast.error(err.message || 'Failed to upload image')
        e.target.value = ''
      } finally {
        setUploading(false)
      }
    }
    
    return (
      <div>
        <textarea
          className="form-control mb-2"
          rows="4"
          placeholder="Enter your answer..."
          {...register(`${fieldName}.answer.text`, {
            required: isRequired ? 'This field is required' : false
          })}
        />
        <div className="mb-2">
          <label className="form-label small">
            Upload Image {imageRequired && <span className="text-danger">*</span>}
          </label>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            className="form-control"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <small className="form-text text-muted">
            Supported formats: JPG, PNG, GIF, WEBP (Max 10MB)
          </small>
          {uploading && (
            <div className="mt-2">
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Uploading...</span>
              </div>
              <span className="text-muted">Uploading image...</span>
            </div>
          )}
          {imageUrl && !uploading && (
            <div className="mt-2">
              <img 
                src={imageUrl} 
                alt="Preview" 
                className="img-thumbnail"
                style={{ maxWidth: '300px', maxHeight: '300px', objectFit: 'contain' }}
                onError={(e) => {
                  e.target.style.display = 'none'
                  toast.error('Failed to load image preview')
                }}
              />
              {uploadedFile && (
                <div className="mt-1">
                  <small className="text-muted">
                    {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(2)} KB)
                  </small>
                </div>
              )}
            </div>
          )}
          {/* Hidden input to store the URL for form submission */}
          <input
            type="hidden"
            {...register(`${fieldName}.answer.image_url`, {
              required: imageRequired ? 'Image is required' : false
            })}
          />
        </div>
      </div>
    )
  }

  return null
}
