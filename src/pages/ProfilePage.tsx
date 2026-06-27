import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { authService, categoryService, collegeService, branchService } from '../services/api'
import type { Category, College, Branch } from '../types'
import { isValidKcetRank } from '../utils/validation'

const ProfilePage = () => {
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Change Password States
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [changePasswordStep, setChangePasswordStep] = useState<1 | 2 | 3>(1)
  const [changePasswordOtp, setChangePasswordOtp] = useState('')
  const [changePasswordToken, setChangePasswordToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleSendChangePasswordOtp = async () => {
    if (!user) return
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await authService.sendOtp(user.email_id, 'change_password')
      setResendCooldown(60)
      setChangePasswordStep(2)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyChangePasswordOtp = async () => {
    if (!user) return
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await authService.verifyOtp(user.email_id, changePasswordOtp.trim(), 'change_password')
      if (res.tempToken) {
        setChangePasswordToken(res.tempToken)
        setChangePasswordStep(3)
      } else {
        setError('Verification failed. No token received.')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (newPassword !== newPasswordConfirm) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      const { strength } = getPasswordStrength(newPassword)
      if (strength < 5) {
        setError('Password does not satisfy the strong password policy.')
        setLoading(false)
        return
      }

      await authService.changePassword(newPassword, newPasswordConfirm, changePasswordToken)
      setSuccess('Password updated successfully!')
      
      // Reset states
      setShowChangePassword(false)
      setChangePasswordStep(1)
      setChangePasswordOtp('')
      setChangePasswordToken('')
      setNewPassword('')
      setNewPasswordConfirm('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  // dropdown data
  const [categories, setCategories] = useState<Category[]>([])
  const [colleges, setColleges] = useState<College[]>([])
  const [branches, setBranches] = useState<Branch[]>([])

  const [formData, setFormData] = useState({
    name: user?.name || '',
    category: (user as any)?.category || '',
    email_id: user?.email_id || '',
    phone_number: user?.phone_number || '',
    kcet_rank: user?.kcet_rank != null ? String(user.kcet_rank) : '',
    // studying fields (locked once set)
    college_code: (user as any)?.college_code || '',
    unique_key: (user as any)?.unique_key || '',
    year_of_starting:
      (user as any)?.year_of_starting != null ? String((user as any).year_of_starting) : '',
  })

  const isCounselling = user?.type_of_student === 'counselling'
  const isStudying = user?.type_of_student === 'studying'

  // If user loads after first render, sync form once it’s available
  useEffect(() => {
    if (!user) return
    setFormData({
      name: user.name || '',
      category: (user as any).category || '',
      email_id: user.email_id || '',
      phone_number: user.phone_number || '',
      kcet_rank: user.kcet_rank != null ? String(user.kcet_rank) : '',
      college_code: (user as any).college_code || '',
      unique_key: (user as any).unique_key || '',
      year_of_starting:
        (user as any).year_of_starting != null ? String((user as any).year_of_starting) : '',
    })
  }, [user])

  // Load categories (for all users)
  useEffect(() => {
    categoryService
      .list()
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(async (err) => {
        console.error('Error loading categories, using fallback:', err)
        // Fallback to hardcoded categories
        try {
          const { HARDCODED_CATEGORIES } = await import('../data/categories')
          setCategories(HARDCODED_CATEGORIES)
        } catch {
          setCategories([])
        }
      })
  }, [])

  // Load colleges (for studying students)
  useEffect(() => {
    if (!isStudying) return
    collegeService
      .list()
      .then(setColleges)
      .catch((err) => {
        console.error('Error loading colleges:', err)
        setColleges([])
      })
  }, [isStudying])

  // When college changes, (re)load branches
  useEffect(() => {
    if (!isStudying) return
    const code = formData.college_code?.toString().trim()
    if (!code) {
      setBranches([])
      setFormData((p) => ({ ...p, unique_key: '' }))
      return
    }
    branchService
      .byCollegeCode(code)
      .then((list) => {
        setBranches(list)
        // clear branch if not part of the new college
        if (!list.some((b) => b.unique_key === formData.unique_key)) {
          setFormData((p) => ({ ...p, unique_key: '' }))
        }
      })
      .catch((err) => {
        console.error('Error loading branches:', err)
        setBranches([])
        setFormData((p) => ({ ...p, unique_key: '' }))
      })
  }, [isStudying, formData.college_code]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const updateData: any = {
        name: formData.name,
        // allow updating category for both if backend supports; safe to send null
        category: formData.category || null,
      }

      if (isCounselling) {
        if (formData.kcet_rank !== '' && formData.kcet_rank != null) {
          if (!isValidKcetRank(formData.kcet_rank)) {
            setError('KCET rank must be between 1 and 400,000.')
            setLoading(false)
            return
          }
          updateData.kcet_rank = parseInt(formData.kcet_rank, 10)
        } else {
          updateData.kcet_rank = null
        }
      }

      if (isStudying) {
        // College and branch are locked for studying students; send as-is for safety
        updateData.college_code = formData.college_code || null
        updateData.unique_key = formData.unique_key || null
        updateData.year_of_starting =
          formData.year_of_starting !== '' && formData.year_of_starting != null
            ? parseInt(formData.year_of_starting, 10)
            : null
      }

      const updatedUser = await authService.updateProfile(updateData)

      // Keep localStorage user fresh so Navbar / other places see it
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        const newUserData = { ...userData, ...updatedUser }
        localStorage.setItem('user', JSON.stringify(newUserData))
      }

      setSuccess('Profile updated successfully!')
      // Reload to refresh AuthContext from localStorage
      setTimeout(() => window.location.reload(), 800)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error updating profile')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-300 dark:border-slate-700">
        <h1 className="text-3xl font-bold mb-6 text-slate-800 dark:text-gray-100">Edit Profile</h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-sky-400 focus:border-blue-500 dark:focus:border-sky-400 bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200"
            />
          </div>

          {/* Category (mainly for counselling; shown for both if you want) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-sky-400 focus:border-blue-500 dark:focus:border-sky-400 bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200"
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.category} value={cat.category}>
                  {cat.category}
                </option>
              ))}
            </select>
          </div>

          {/* Email (immutable) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              value={formData.email_id}
              disabled
              className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-400"
            />
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">Email cannot be changed</p>
          </div>

          {/* Phone (immutable) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">Phone Number</label>
            <input
              type="tel"
              value={formData.phone_number}
              disabled
              className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-400"
            />
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">Phone number cannot be changed</p>
          </div>

          {/* KCET Rank for counselling students */}
          {isCounselling && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">KCET Rank</label>
              <input
                type="number"
                name="kcet_rank"
                value={formData.kcet_rank}
                onChange={handleInputChange}
                min={1}
                max={400000}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-sky-400 focus:border-blue-500 dark:focus:border-sky-400 bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200"
              />
            </div>
          )}

          {/* Studying student editable fields */}
          {isStudying && (
            <>
              {/* College (locked) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                  College
                </label>
                <select
                  name="college_code"
                  value={formData.college_code}
                  onChange={handleInputChange}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-gray-400"
                >
                  <option value="">{formData.college_code ? 'Loading...' : 'Not set'}</option>
                  {colleges.map((c) => (
                    <option key={c.college_id} value={c.college_code}>
                      {c.college_name} ({c.college_code})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                  College is fixed based on registration.
                </p>
              </div>

              {/* Branch (locked) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                  Branch
                </label>
                <select
                  name="unique_key"
                  value={formData.unique_key}
                  onChange={handleInputChange}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-gray-400"
                >
                  <option value="">{formData.unique_key ? 'Loading...' : 'Not set'}</option>
                  {branches.map(branch => (
                    <option key={branch.unique_key} value={branch.unique_key}>
                      {branch.branch_name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                  Branch is fixed based on registration.
                </p>
              </div>

              {/* Year of Starting */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">Year of Starting</label>
                <input
                  type="number"
                  name="year_of_starting"
                  value={formData.year_of_starting}
                  disabled
                  onChange={handleInputChange}
                  min={2020}
                  max={new Date().getFullYear()}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-sky-400 focus:border-blue-500 dark:focus:border-sky-400 bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200"
                />
              </div>

              {/* KCET Rank (read-only for studying) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">KCET Rank</label>
                <input
                  type="number"
                  name="kcet_rank"
                  value={formData.kcet_rank}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                  KCET Rank is fixed based on registration.
                </p>
              </div>
            </>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 dark:bg-sky-400 hover:bg-blue-700 dark:hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-sky-400 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        <hr className="my-8 border-slate-200 dark:border-slate-700" />

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowChangePassword(!showChangePassword)}
            className="w-full flex justify-between items-center py-2 text-left font-semibold text-slate-800 dark:text-gray-200 border-b border-slate-200 dark:border-slate-700 focus:outline-none"
          >
            <span>Change Password</span>
            <svg
              className={`w-5 h-5 transform transition-transform ${showChangePassword ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showChangePassword && (
            <div className="p-4 bg-slate-50 dark:bg-[#1f2937] rounded-lg border border-slate-200 dark:border-slate-700 space-y-6 transition-all duration-300">
              {changePasswordStep === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-gray-300">
                    To change your password, we need to send a verification code to your registered email: <strong>{user.email_id}</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={handleSendChangePasswordOtp}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    {loading ? 'Sending OTP...' : 'Send Verification OTP'}
                  </button>
                </div>
              )}

              {changePasswordStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-gray-300">
                    Enter the 6-digit verification code sent to <strong>{user.email_id}</strong>.
                  </p>
                  <div>
                    <input
                      type="text"
                      required
                      value={changePasswordOtp}
                      onChange={(e) => setChangePasswordOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="w-full text-center tracking-[0.5em] font-mono text-xl px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white"
                      placeholder="------"
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-gray-400">Didn't receive code?</span>
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || loading}
                      onClick={handleSendChangePasswordOtp}
                      className="text-blue-600 dark:text-sky-400 hover:underline font-semibold disabled:opacity-50"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                    </button>
                  </div>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setChangePasswordStep(1)}
                      className="flex-1 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-gray-300"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyChangePasswordOtp}
                      disabled={loading || changePasswordOtp.length !== 6}
                      className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                    >
                      {loading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </div>
                </div>
              )}

              {changePasswordStep === 3 && (
                <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                      New Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="block w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-blue-500"
                        placeholder="Enter new strong password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
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

                    {/* Password requirements visual validation checklist */}
                    {newPassword.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 dark:text-gray-400">Password Strength:</span>
                          <span className={`font-semibold ${
                            getPasswordStrength(newPassword).strength <= 2 ? 'text-red-500' :
                            getPasswordStrength(newPassword).strength <= 4 ? 'text-yellow-500' : 'text-green-500'
                          }`}>
                            {getPasswordStrength(newPassword).strength <= 2 ? 'Weak' :
                             getPasswordStrength(newPassword).strength <= 4 ? 'Medium' : 'Strong'}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              getPasswordStrength(newPassword).strength <= 2 ? 'bg-red-500' :
                              getPasswordStrength(newPassword).strength <= 4 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${(getPasswordStrength(newPassword).strength / 5) * 100}%` }}
                          />
                        </div>
                        <ul className="text-xs space-y-1 mt-2 text-slate-500 dark:text-gray-400">
                          <li className="flex items-center gap-1.5">
                            {newPassword.length >= 8 ? (
                              <span className="text-green-500 font-semibold">✓</span>
                            ) : (
                              <span className="text-red-500">○</span>
                            )}
                            <span className={newPassword.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}>
                              At least 8 characters
                            </span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            {/[A-Z]/.test(newPassword) ? (
                              <span className="text-green-500 font-semibold">✓</span>
                            ) : (
                              <span className="text-red-500">○</span>
                            )}
                            <span className={/[A-Z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                              One uppercase letter (A-Z)
                            </span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            {/[a-z]/.test(newPassword) ? (
                              <span className="text-green-500 font-semibold">✓</span>
                            ) : (
                              <span className="text-red-500">○</span>
                            )}
                            <span className={/[a-z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                              One lowercase letter (a-z)
                            </span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            {/[0-9]/.test(newPassword) ? (
                              <span className="text-green-500 font-semibold">✓</span>
                            ) : (
                              <span className="text-red-500">○</span>
                            )}
                            <span className={/[0-9]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                              One numeric digit (0-9)
                            </span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            {/[^A-Za-z0-9]/.test(newPassword) ? (
                              <span className="text-green-500 font-semibold">✓</span>
                            ) : (
                              <span className="text-red-500">○</span>
                            )}
                            <span className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                              One special character (e.g. !@#$%)
                            </span>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                      Confirm New Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        type={showPasswordConfirm ? "text" : "password"}
                        required
                        value={newPasswordConfirm}
                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                        className="block w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-blue-500"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
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
                    {newPasswordConfirm.length > 0 && (
                      <p className={`mt-1 text-xs font-semibold ${newPassword === newPasswordConfirm ? 'text-green-500' : 'text-red-500'}`}>
                        {newPassword === newPasswordConfirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || newPassword !== newPasswordConfirm || getPasswordStrength(newPassword).strength < 5}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Changing Password...' : 'Change Password'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getPasswordStrength(password: string) {
  let strength = 0;
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  strength = Object.values(checks).filter(Boolean).length;
  return { strength, checks };
}

export default ProfilePage
