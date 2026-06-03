import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService, collegeService, branchService, categoryService, studentService } from '../services/api'
import type { College, Branch, Category } from '../types'

const RegisterStudying = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [colleges, setColleges] = useState<College[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  const [formData, setFormData] = useState({
    name: '',
    email_id: '',
    phone_number: '',
    password: '',
    password_confirm: '',
    college_code: '',
    unique_key: '',
    year_of_starting: '',
    usn: '',
    category: '',
    id_card_image: null as File | null,
    kcet_rank: '',
  })

  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Load colleges and categories
  useEffect(() => {
    collegeService
      .list()
      .then(setColleges)
      .catch((err) => {
        console.error('Error loading colleges:', err)
        setColleges([])
      })

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

  // Load branches when college changes
  useEffect(() => {
    const code = formData.college_code?.toString().trim()
    if (!code) {
      setBranches([])
      setFormData((prev) => ({ ...prev, unique_key: '' }))
      return
    }
    branchService
      .byCollegeCode(code)
      .then((list) => {
        setBranches(list)
        if (!list.some((b) => b.unique_key === formData.unique_key)) {
          setFormData((prev) => ({ ...prev, unique_key: '' }))
        }
      })
      .catch((err) => {
        console.error('Error loading branches:', err)
        setBranches([])
        setFormData((prev) => ({ ...prev, unique_key: '' }))
      })
  }, [formData.college_code])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
    setSuccessMessage('')
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const allowed =
        file.type.startsWith('image/') ||
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf')
      if (!allowed) {
        setError('Please select a JPG, PNG, WEBP, or PDF file')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File too large. Maximum size is 10MB.')
        return
      }
      setFormData((prev) => ({ ...prev, id_card_image: file }))
      setError('')
      setSuccessMessage('')

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setPreviewImage(null)
      } else {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviewImage(reader.result as string)
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
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
      if (!formData.college_code) {
        setError('College is required')
        setLoading(false)
        return
      }
      if (!formData.unique_key) {
        setError('Branch is required')
        setLoading(false)
        return
      }
      if (!formData.year_of_starting || parseInt(formData.year_of_starting) <= 0) {
        setError('Valid year of starting is required')
        setLoading(false)
        return
      }
      if (!formData.usn.trim()) {
        setError('USN/Student ID is required')
        setLoading(false)
        return
      }
      if (!formData.category) {
        setError('Category is required')
        setLoading(false)
        return
      }
      if (!formData.kcet_rank || parseInt(formData.kcet_rank, 10) <= 0) {
        setError('Valid KCET rank is required')
        setLoading(false)
        return
      }
      if (!formData.id_card_image) {
        setError('Student ID card upload is required')
        setLoading(false)
        return
      }

      const { id_card_url } = await studentService.uploadIdCard(formData.id_card_image)

      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        email_id: formData.email_id.trim(),
        phone_number: formData.phone_number.trim(),
        password: formData.password,
        password_confirm: formData.password_confirm,
        college_code: formData.college_code,
        unique_key: formData.unique_key,
        year_of_starting: parseInt(formData.year_of_starting, 10),
        usn: formData.usn.trim(),
        id_card_url,
        kcet_rank: parseInt(formData.kcet_rank, 10),
      }
      payload.category = formData.category

      const response = await authService.registerStudying(payload)

      setSuccessMessage(
        response.message ||
          'Registration submitted successfully.\n\nYour account is pending administrator approval.\nYou will receive an email once your application has been reviewed.'
      )
      setFormData({
        name: '',
        email_id: '',
        phone_number: '',
        password: '',
        password_confirm: '',
        college_code: '',
        unique_key: '',
        year_of_starting: '',
        usn: '',
        category: '',
        id_card_image: null,
        kcet_rank: '',
      })
      setPreviewImage(null)
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
      <div className="max-w-2xl w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Register as Studying Student
            </h1>
            <p className="text-slate-600 dark:text-gray-300">
              Create your account and upload your college student ID card for admin review
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 whitespace-pre-line rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
              {successMessage}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => navigate('/auth?login=true')}
                  className="text-sm font-semibold text-emerald-700 underline dark:text-emerald-300"
                >
                  Go to login
                </button>
              </div>
            </div>
          )}

          {!successMessage && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
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
                             focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label
                  htmlFor="email_id"
                  className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
                >
                  College Email *
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
                             focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
                  placeholder="Enter your college email"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
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
                             focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
                  placeholder="Enter your phone number"
                />
              </div>

              <div>
                <label
                  htmlFor="usn"
                  className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
                >
                  USN/Student ID *
                </label>
                <input
                  type="text"
                  id="usn"
                  name="usn"
                  value={formData.usn}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-slate-900 dark:text-white
                             focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
                  placeholder="Enter your USN"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="college_code"
                  className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
                >
                  College *
                </label>
                <select
                  id="college_code"
                  name="college_code"
                  value={formData.college_code}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-slate-900 dark:text-white
                             focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
                >
                  <option value="">Select college</option>
                  {colleges.map((college) => (
                    <option key={college.college_code} value={college.college_code}>
                      {college.college_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="unique_key"
                  className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
                >
                  Branch *
                </label>
                <select
                  id="unique_key"
                  name="unique_key"
                  value={formData.unique_key}
                  onChange={handleInputChange}
                  required
                  disabled={!formData.college_code}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-slate-900 dark:text-white
                             focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch.unique_key} value={branch.unique_key}>
                      {branch.branch_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="year_of_starting"
                  className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
                >
                  Year of Starting *
                </label>
                <input
                  type="number"
                  id="year_of_starting"
                  name="year_of_starting"
                  value={formData.year_of_starting}
                  onChange={handleInputChange}
                  required
                  min="2000"
                  max={new Date().getFullYear() + 1}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-slate-900 dark:text-white
                             focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
                  placeholder="e.g., 2024"
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
                             focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.category} value={cat.category}>
                      {cat.category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
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
                             focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
                  placeholder="Enter your KCET rank"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="id_card_image"
                className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
              >
                Upload Student ID Card *
              </label>
              <input
                type="file"
                id="id_card_image"
                name="id_card_image"
                accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
                onChange={handleImageChange}
                required
                className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-slate-900 dark:text-white
                           focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
              />
              {previewImage && (
                <div className="mt-4">
                  <img
                    src={previewImage}
                    alt="ID Card Preview"
                    className="max-w-full h-48 object-contain rounded-lg border border-slate-300 dark:border-gray-600"
                  />
                </div>
              )}
              <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                Upload a clear photo or PDF of your college ID card (JPG, PNG, WEBP, PDF — max 10MB)
              </p>
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
                           focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
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
                           focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600
                         text-white font-semibold py-3 px-6 rounded-lg transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting registration...' : 'Register'}
            </button>
          </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 dark:text-gray-400">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/auth?login=true')}
                className="text-green-600 dark:text-green-400 hover:underline font-semibold"
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

export default RegisterStudying

