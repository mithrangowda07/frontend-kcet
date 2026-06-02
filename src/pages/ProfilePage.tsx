import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { authService, categoryService, collegeService, branchService } from '../services/api'
import type { Category, College, Branch } from '../types'

const ProfilePage = () => {
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
        updateData.kcet_rank =
          formData.kcet_rank !== '' && formData.kcet_rank != null
            ? parseInt(formData.kcet_rank, 10)
            : null
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
      </div>
    </div>
  )
}

export default ProfilePage
