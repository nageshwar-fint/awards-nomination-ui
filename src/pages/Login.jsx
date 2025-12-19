import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'

import { login } from '../api/auth'
import { useAuth } from '../auth/AuthContext'
import { handleError } from '../utils/errorHandler'

export default function Login() {
  const { register, handleSubmit } = useForm()
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()

  const onSubmit = async (data) => {
    try {
      console.log('Attempting login with:', { email: data.email })
      const res = await login(data)
      console.log('Login response:', res)

      // backend returns access_token
      if (res.access_token) {
        loginWithToken(res.access_token)
        toast.success('Login successful')
        
        // Redirect based on role
        try {
          const decoded = JSON.parse(atob(res.access_token.split('.')[1]))
          console.log('Decoded token:', decoded)
          navigate('/dashboard')
        } catch (decodeErr) {
          console.error('Failed to decode token:', decodeErr)
          // Still navigate even if decode fails
          navigate('/dashboard')
        }
      } else if (res.user && res.access_token === undefined) {
        // Check if response format is different
        handleError('Invalid response format: missing access_token', 'Login failed', 'login-invalid-response')
      } else {
        handleError('Invalid response from server', 'Login failed', 'login-invalid-response')
      }
    } catch (err) {
      console.error('Login error:', err)
      console.error('Error details:', {
        message: err.message,
        status: err.status,
        data: err.data
      })
      
      // Provide more specific error messages
      let errorMsg = 'Login failed'
      if (err.status === 401 || err.status === 403) {
        errorMsg = 'Invalid email or password'
      } else if (err.status === 400) {
        // Check if it's the backend serialization error (UserRead password field issue)
        if (err.message && err.message.includes('password') && err.message.includes('Field required')) {
          errorMsg = 'Backend Configuration Error: The server has a schema issue. Please contact the backend team. Your credentials may be correct, but the server cannot serialize the response. This needs to be fixed in the backend UserRead schema.'
        } else {
          errorMsg = err.message || 'Bad request. Please check your input.'
        }
      } else if (err.status === 0) {
        errorMsg = 'Network error. Please check if the backend server is running.'
      } else if (err.message) {
        errorMsg = err.message
      }
      
      handleError(err, errorMsg, 'login-error')
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>🏆 Awards System</h2>
          <p className="text-muted">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="Enter your email"
              {...register('email', { required: true })}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter your password"
              {...register('password', { required: true })}
            />
          </div>

          <button className="btn btn-primary w-100 mb-3" type="submit">
            Sign In
          </button>
        </form>

        <div className="text-center">
          <small className="text-muted">
            Don't have an account?{' '}
            <Link to="/register" className="fw-bold">Register</Link>
          </small>
        </div>
      </div>
    </div>
  )
}
