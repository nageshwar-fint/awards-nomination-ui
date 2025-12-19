import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'

import { login } from '../api/auth'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const { register, handleSubmit } = useForm()
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()

  const onSubmit = async (data) => {
    try {
      const res = await login(data)

      // backend returns access_token
      if (res.access_token) {
        loginWithToken(res.access_token)
        toast.success('Login successful')
        
        // Redirect based on role
        const decoded = JSON.parse(atob(res.access_token.split('.')[1]))
        if (decoded.role === 'HR') {
          // HR users might want to go to admin, but dashboard is fine too
          navigate('/dashboard')
        } else {
          navigate('/dashboard')
        }
      } else {
        toast.error('Invalid response from server')
      }
    } catch (err) {
      const errorMessage = err.data?.error?.message || err.message || 'Invalid credentials'
      toast.error(errorMessage)
    }
  }

  return (
    <div className="container mt-5" style={{ maxWidth: 420 }}>
      <h3 className="mb-3">Login</h3>

      <form onSubmit={handleSubmit(onSubmit)}>
        <input
          className="form-control mb-2"
          placeholder="Email"
          {...register('email', { required: true })}
        />

        <input
          type="password"
          className="form-control mb-3"
          placeholder="Password"
          {...register('password', { required: true })}
        />

        <button className="btn btn-primary w-100 mb-2">
          Login
        </button>
      </form>

      <div className="text-center">
        <small>
          Don’t have an account?{' '}
          <Link to="/register">Register</Link>
        </small>
      </div>
    </div>
  )
}
