import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import toast from 'react-hot-toast'

import { registerUser } from '../api/auth'
import { SECURITY_QUESTIONS } from '../constants/securityQuestions'
import { handleError } from '../utils/errorHandler'

export default function Register() {
  const navigate = useNavigate()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      selectedQuestions: [],
      answers: {},
    },
  })

  // Convert checkbox values (strings) to numbers
  const selectedQuestions = (watch('selectedQuestions') || []).map(Number)
  const password = watch('password')

  const onSubmit = async (data) => {
    if (selectedQuestions.length !== 3) {
      toast.error('Please select exactly 3 security questions')
      return
    }

    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    const security_questions = selectedQuestions.map((index) => ({
      question_text: SECURITY_QUESTIONS[index],
      answer: data.answers?.[index],
    }))

    if (
      security_questions.some(
        (q) => !q.answer || !q.answer.trim()
      )
    ) {
      toast.error('Please answer all selected questions')
      return
    }

    const payload = {
      name: data.name,
      email: data.email,
      password: data.password,
      team_id: data.team_id || null,
      security_questions,
    }

    try {
      await registerUser(payload)
      toast.success('Registration successful. Please login.')
      navigate('/login')
    } catch (err) {
      handleError(err, 'Registration failed', 'register-error')
    }
  }

  return (
    <div className="container mt-5" style={{ maxWidth: 650 }}>
      <h3 className="mb-3">Register</h3>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Name */}
        <input
          className="form-control mb-2"
          placeholder="Full Name"
          {...register('name', { required: true })}
        />
        {errors.name && (
          <small className="text-danger">
            Name is required
          </small>
        )}

        {/* Email */}
        <input
          className="form-control mb-2"
          placeholder="Email"
          {...register('email', { required: true })}
        />
        {errors.email && (
          <small className="text-danger">
            Email is required
          </small>
        )}

        {/* Password */}
        <div className="input-group mb-2">
          <input
            type={showPassword ? 'text' : 'password'}
            className="form-control"
            placeholder="Password (min 8 characters)"
            {...register('password', {
              required: true,
              minLength: 8,
            })}
          />
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {errors.password && (
          <small className="text-danger">
            Password must be at least 8 characters
          </small>
        )}

        {/* Confirm Password */}
        <div className="input-group mb-3">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            className="form-control"
            placeholder="Confirm Password"
            {...register('confirmPassword', {
              required: true,
              validate: (value) =>
                value === password || 'Passwords do not match',
            })}
          />
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() =>
              setShowConfirmPassword(!showConfirmPassword)
            }
          >
            {showConfirmPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {errors.confirmPassword && (
          <small className="text-danger">
            {errors.confirmPassword.message ||
              'Confirm password is required'}
          </small>
        )}

        {/* Team ID */}
        <input
          className="form-control mb-3"
          placeholder="Team ID (optional)"
          {...register('team_id')}
        />

        <hr />

        {/* Security Questions */}
        <h5>Select 3 Security Questions</h5>
        <small className="text-muted">
          You must select and answer exactly 3
        </small>

        {SECURITY_QUESTIONS.map((question, index) => {
          const isSelected = selectedQuestions.includes(index)

          return (
            <div key={index} className="mb-3">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  value={index}
                  disabled={
                    !isSelected &&
                    selectedQuestions.length >= 3
                  }
                  {...register('selectedQuestions')}
                />
                <label className="form-check-label">
                  {question}
                </label>
              </div>

              {isSelected && (
                <input
                  className="form-control mt-2"
                  placeholder="Your answer"
                  {...register(`answers.${index}`, {
                    required: true,
                  })}
                />
              )}
            </div>
          )
        })}

        <button className="btn btn-success w-100 mt-3">
          Register
        </button>
      </form>

      <div className="text-center mt-3">
        <small>
          Already have an account?{' '}
          <Link to="/login">Login</Link>
        </small>
      </div>
    </div>
  )
}
