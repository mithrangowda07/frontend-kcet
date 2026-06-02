import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import { categoryService } from '../services/api'
import type { Category } from '../types'

const RegisterCounselling = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])

  const [formData, setFormData] = useState({
    name: '',
    email_id: '',
    phone_number: '',
    password: '',
    password_confirm: '',
    kcet_rank: '',
    category: '',
  })

  // Load categories
  useEffect(() => {
    categoryService
      .list()
      .then((data) => {
        setCategories(Array.isArray(data) ? data : [])
      })
      .catch(async (err) => {
        console.error('Error loading categories, using fallback:', err)
        try {
          const { HARDCODED_CATEGORIES } = await import('../data/categories')
          setCategories(HARDCODED_CATEGORIES)
        } catch {
          setCategories([])
        }
      })
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate form
      if (!formData.name.trim()) {
        setError('Name is required')
        setLoading(false)
        return
      }
      if (!formData.email_id.trim()) {
        setError('Email is required')
        setLoading(false)
        return
      }
      if (!formData.phone_number.trim()) {
        setError('Phone number is required')
        setLoading(false)
        return
      }
      if (!formData.password) {
        setError('Password is required')
        setLoading(false)
        return
      }
      if (formData.password !== formData.password_confirm) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }
      if (!formData.kcet_rank || parseInt(formData.kcet_rank) <= 0) {
        setError('Valid KCET rank is required')
        setLoading(false)
        return
      }

      const registerData = {
        name: formData.name.trim(),
        email_id: formData.email_id.trim(),
        phone_number: formData.phone_number.trim(),
        password: formData.password,
        password_confirm: formData.password_confirm,
        kcet_rank: parseInt(formData.kcet_rank),
        category: formData.category || null,
      }

      const response = await authService.registerCounselling(registerData)

      // Store tokens and user data
      if (response.tokens) {
        authService.setTokens(response.tokens)
        if (response.student) {
          localStorage.setItem('user', JSON.stringify(response.student))
        }
        // Update auth context by fetching user data
        try {
          const userData = await authService.me()
          localStorage.setItem('user', JSON.stringify(userData))
        } catch (err) {
          console.error('Error fetching user data:', err)
        }
      }

      // Redirect to login page (as per requirements)
      navigate('/auth?login=true', { replace: true })
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Registration failed. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#111827] px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Register as Counselling Student
            </h1>
            <p className="text-slate-600 dark:text-gray-300">
              Create your account to get personalized college recommendations
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
              >
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-slate-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label
                htmlFor="email_id"
                className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
              >
                Email Address *
              </label>
              <input
                type="email"
                id="email_id"
                name="email_id"
                value={formData.email_id}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-slate-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label
                htmlFor="phone_number"
                className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
              >
                Phone Number *
              </label>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-slate-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label
                htmlFor="kcet_rank"
                className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
              >
                KCET Rank *
              </label>
              <input
                type="number"
                id="kcet_rank"
                name="kcet_rank"
                value={formData.kcet_rank}
                onChange={handleInputChange}
                required
                min="1"
                className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-slate-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                placeholder="Enter your KCET rank"
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
              >
                Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-slate-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              >
                <option value="">Select category (optional)</option>
                {categories.map((cat) => (
                  <option key={cat.category} value={cat.category}>
                    {cat.category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
              >
                Password *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-slate-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                placeholder="Enter password (min 8 characters)"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                Must contain uppercase, lowercase, number, and special character
              </p>
            </div>

            <div>
              <label
                htmlFor="password_confirm"
                className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
              >
                Confirm Password *
              </label>
              <input
                type="password"
                id="password_confirm"
                name="password_confirm"
                value={formData.password_confirm}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-slate-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                         text-white font-semibold py-3 px-6 rounded-lg transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 dark:text-gray-400">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/auth?login=true')}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                Login here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterCounselling

