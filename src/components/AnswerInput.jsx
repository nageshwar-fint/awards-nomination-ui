import { useFormContext } from 'react-hook-form'

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
            Image URL {imageRequired && <span className="text-danger">*</span>}
          </label>
          <input
            type="url"
            className="form-control"
            placeholder="https://example.com/image.jpg"
            {...register(`${fieldName}.answer.image_url`, {
              required: imageRequired ? 'Image URL is required' : false,
              pattern: {
                value: /^https?:\/\/.+/,
                message: 'Please enter a valid URL starting with http:// or https://'
              }
            })}
          />
          {imageUrl && (
            <div className="mt-2">
              <img 
                src={imageUrl} 
                alt="Preview" 
                className="img-thumbnail"
                style={{ maxWidth: '200px', maxHeight: '200px' }}
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
