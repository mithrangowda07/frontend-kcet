import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import { categoryService } from '../services/api'
import type { Category } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { isValidKcetRank } from '../utils/validation'

const RegisterCounselling = () => {
  const navigate = useNavigate()
  const { loginWithTokens } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])

  // OTP Verification States
  const [step, setStep] = useState<1 | 2>(1)
  const [otp, setOtp] = useState('')
  const [verificationToken, setVerificationToken] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [otpSent, setOtpSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)

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

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSendOtp = async () => {
    setError('')
    setLoading(true)
    try {
      const email = formData.email_id.trim()
      if (!email) {
        setError('Email address is required.')
        setLoading(false)
        return
      }
      // Simple regex check
      if (!/\S+@\S+\.\S+/.test(email)) {
        setError('Please enter a valid email address.')
        setLoading(false)
        return
      }

      await authService.sendOtp(email, 'registration')
      setOtpSent(true)
      setResendCooldown(60)
    } catch (err: any) {
      const errMsg =
        err.response?.data?.error || err.response?.data?.message || 'Failed to send OTP.'
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setError('')
    setLoading(true)
    try {
      const email = formData.email_id.trim()
      if (!otp.trim()) {
        setError('OTP is required.')
        setLoading(false)
        return
      }
      const response = await authService.verifyOtp(email, otp.trim(), 'registration')
      if (response.tempToken) {
        setVerificationToken(response.tempToken)
        setStep(2)
      } else {
        setError('Verification failed. No token received.')
      }
    } catch (err: any) {
      const errMsg =
        err.response?.data?.error || err.response?.data?.message || 'Invalid OTP.'
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  // Password Policy Check
  const password = formData.password
  const isMinLength = password.length >= 8
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)

  const passwordRequirements = [
    { label: 'At least 8 characters', met: isMinLength },
    { label: 'One uppercase letter (A-Z)', met: hasUpper },
    { label: 'One lowercase letter (a-z)', met: hasLower },
    { label: 'One numeric digit (0-9)', met: hasNumber },
    { label: 'One special character (e.g. !@#$%)', met: hasSpecial },
  ]

  const strengthCount = passwordRequirements.filter((req) => req.met).length
  const strengthPercentage = (strengthCount / passwordRequirements.length) * 100

  const getStrengthLabel = () => {
    if (password.length === 0) return ''
    if (strengthCount <= 2) return 'Weak'
    if (strengthCount <= 4) return 'Medium'
    return 'Strong'
  }

  const getStrengthColor = () => {
    if (strengthCount <= 2) return 'bg-red-500'
    if (strengthCount <= 4) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStrengthTextColor = () => {
    if (strengthCount <= 2) return 'text-red-500'
    if (strengthCount <= 4) return 'text-yellow-500'
    return 'text-green-500'
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
      if (!formData.phone_number.trim()) {
        setError('Phone number is required')
        setLoading(false)
        return
      }
      if (strengthCount < 5) {
        setError('Password does not satisfy the strong password policy.')
        setLoading(false)
        return
      }
      if (formData.password !== formData.password_confirm) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }
      if (!formData.kcet_rank || !isValidKcetRank(formData.kcet_rank)) {
        setError('KCET rank must be between 1 and 400,000.')
        setLoading(false)
        return
      }
      if (!formData.category) {
        setError('Category is required')
        setLoading(false)
        return
      }
      if (!verificationToken) {
        setError('Verification token is missing. Please restart registration.')
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
        category: formData.category,
        email_verification_token: verificationToken,
      }

      const response = await authService.registerCounselling(registerData)

      // Store tokens and user data, then login using context
      if (response.tokens && response.student) {
        loginWithTokens(response.tokens, response.student)
      }

      // Redirect to counselling dashboard
      navigate('/dashboard/counselling', { replace: true })
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 transition-all duration-300">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Register as Counselling Student
            </h1>
            <p className="text-slate-600 dark:text-gray-300">
              {step === 1 ? 'Verify your email to get started' : 'Complete your registration details'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="email_id"
                  className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
                >
                  Email Address *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email_id"
                    name="email_id"
                    value={formData.email_id}
                    onChange={handleInputChange}
                    disabled={otpSent}
                    required
                    className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-700 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-gray-800
                               focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                  {otpSent && (
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false)
                        setOtp('')
                      }}
                      className="absolute right-3 top-2.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Change
                    </button>
                  )}
                </div>
              </div>

              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || !formData.email_id}
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                             text-white font-semibold py-3 px-6 rounded-lg transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label
                      htmlFor="otp"
                      className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
                    >
                      Enter 6-Digit OTP *
                    </label>
                    <input
                      type="text"
                      id="otp"
                      name="otp"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      required
                      className="w-full text-center tracking-[0.5em] font-mono text-xl px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg
                                 bg-white dark:bg-gray-700 text-slate-900 dark:text-white
                                 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      placeholder="------"
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-gray-400">
                      Didn't receive code?
                    </span>
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || loading}
                      onClick={handleSendOtp}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-semibold disabled:opacity-50"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading || otp.length !== 6}
                    className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600
                               text-white font-semibold py-3 px-6 rounded-lg transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Email Address (Verified)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={formData.email_id}
                    disabled
                    className="w-full px-4 py-2 border border-green-300 dark:border-green-800 rounded-lg
                               bg-green-50/50 dark:bg-green-950/20 text-slate-600 dark:text-gray-400"
                  />
                  <span className="absolute right-3 top-2.5 text-green-600 dark:text-green-400 flex items-center gap-1 text-sm font-medium">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Verified
                  </span>
                </div>
              </div>

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
                  min={1}
                  max={400000}
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
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-slate-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.category} value={cat.category}>
                      {cat.category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Password details with strength validation */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
                >
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 pr-10 border border-slate-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-700 text-slate-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    placeholder="Enter password (min 8 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-gray-400">Password Strength:</span>
                      <span className={`font-semibold ${getStrengthTextColor()}`}>
                        {getStrengthLabel()}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                        style={{ width: `${strengthPercentage}%` }}
                      />
                    </div>
                    <ul className="text-xs space-y-1 mt-2 text-slate-500 dark:text-gray-400">
                      {passwordRequirements.map((req, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          {req.met ? (
                            <span className="text-green-500 font-semibold">✓</span>
                          ) : (
                            <span className="text-red-500">○</span>
                          )}
                          <span className={req.met ? 'text-green-600 dark:text-green-400' : ''}>
                            {req.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="password_confirm"
                  className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
                >
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showPasswordConfirm ? "text" : "password"}
                    id="password_confirm"
                    name="password_confirm"
                    value={formData.password_confirm}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 pr-10 border border-slate-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-700 text-slate-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    {showPasswordConfirm ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {formData.password_confirm.length > 0 && (
                  <p className={`mt-1 text-xs font-semibold ${formData.password === formData.password_confirm ? 'text-green-500' : 'text-red-500'}`}>
                    {formData.password === formData.password_confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                           text-white font-semibold py-3 px-6 rounded-lg transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Completing Registration...' : 'Complete Registration'}
              </button>
            </form>
          )}

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
