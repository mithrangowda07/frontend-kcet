import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { meetingService } from '../services/api'

interface MeetingRequestFormProps {
  onSuccess?: () => void
}

export default function MeetingRequestForm({ onSuccess }: MeetingRequestFormProps) {
  const { user } = useAuth()
  
  // Auto-filled details from logged-in user profile
  const collegeName = user?.unique_key_data?.college?.college_name || 'N/A'
  const branchName = user?.unique_key_data?.branch_name || 'N/A'
  const kcetRank = user?.kcet_rank || 0

  const [currentYear, setCurrentYear] = useState('')
  const [admissionType, setAdmissionType] = useState('KCET')
  const [languages, setLanguages] = useState<string[]>([])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [meetingCapacity, setMeetingCapacity] = useState(25)
  
  const [question1, setQuestion1] = useState('')
  const [question2, setQuestion2] = useState('')
  const [question3, setQuestion3] = useState('')
  const [question4, setQuestion4] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleLanguageChange = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter((l) => l !== lang))
    } else {
      setLanguages([...languages, lang])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    // Compulsory field validation
    if (!currentYear) {
      setError('Please select your current year.')
      return
    }
    if (languages.length === 0) {
      setError('Please select at least one language you are comfortable in.')
      return
    }
    if (!startTime || !endTime) {
      setError('Please specify start and end timings for the meeting.')
      return
    }
    if (!question1 || !question2 || !question3 || !question4) {
      setError('Please answer all validation questions.')
      return
    }

    const start = new Date(startTime)
    const end = new Date(endTime)
    const now = new Date()

    if (end <= start) {
      setError('End time must be strictly after start time.')
      return
    }

    // Must be in the future
    if (start <= now) {
      setError('Start time must be in the future.')
      return
    }

    // Local validation check for current year
    const startYear = user?.year_of_starting
    if (!startYear) {
      setError('Your year of admission starting is missing from your profile.')
      return
    }
    const currentYearNum = new Date().getFullYear()
    const maxYear = currentYearNum - startYear + 1
    
    const yearTextToNum: Record<string, number> = {
      '1st Year': 1,
      '2nd Year': 2,
      '3rd Year': 3,
      '4th Year': 4,
    }
    const selectedYearNum = yearTextToNum[currentYear] || 0
    if (selectedYearNum > maxYear) {
      setError(`Invalid year: Based on your start year (${startYear}), you can only be maximum ${maxYear}th Year in ${currentYearNum}.`)
      return
    }

    setSubmitting(true)
    try {
      await meetingService.create({
        currentYear,
        admissionType,
        languages,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        meetingCapacity,
        question1,
        question2,
        question3,
        question4,
      })
      
      setSuccessMsg('Meeting request submitted successfully! It is now pending admin approval.')
      
      // Clear form
      setCurrentYear('')
      setLanguages([])
      setStartTime('')
      setEndTime('')
      setMeetingCapacity(25)
      setQuestion1('')
      setQuestion2('')
      setQuestion3('')
      setQuestion4('')

      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || 'Error creating meeting request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
      <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-gray-100 flex items-center gap-2">
        <span>📅</span> Request a Group Meeting Session
      </h2>
      <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">
        Host an interactive guidance session for counselling candidates. Fill out the request form below for admin validation.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-lg border border-red-200 dark:border-red-800">
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded-lg border border-green-200 dark:border-green-800">
          ✅ {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Read-Only Auto-filled details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">College (Auto)</span>
            <p className="font-semibold text-sm text-slate-700 dark:text-gray-200">{collegeName}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">Branch (Auto)</span>
            <p className="font-semibold text-sm text-slate-700 dark:text-gray-200">{branchName}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">KCET Rank (Auto)</span>
            <p className="font-semibold text-sm text-slate-700 dark:text-gray-200">{kcetRank}</p>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              Current Year <span className="text-red-500">*</span>
            </label>
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Select Year</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              Admission Type <span className="text-red-500">*</span>
            </label>
            <select
              value={admissionType}
              onChange={(e) => setAdmissionType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="KCET">KCET</option>
              <option value="COMEDK">COMEDK</option>
              <option value="Management">Management</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
              Comfortable Languages <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="inline-flex items-center text-slate-700 dark:text-gray-300 text-sm">
                <input
                  type="checkbox"
                  checked={languages.includes('English')}
                  onChange={() => handleLanguageChange('English')}
                  className="rounded text-sky-600 focus:ring-sky-500 mr-2"
                />
                English
              </label>
              <label className="inline-flex items-center text-slate-700 dark:text-gray-300 text-sm">
                <input
                  type="checkbox"
                  checked={languages.includes('Kannada')}
                  onChange={() => handleLanguageChange('Kannada')}
                  className="rounded text-sky-600 focus:ring-sky-500 mr-2"
                />
                Kannada
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              Meeting Capacity <span className="text-red-500">*</span>
            </label>
            <select
              value={meetingCapacity}
              onChange={(e) => setMeetingCapacity(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={75}>75</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              Start Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              End Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Validation Questions */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-md font-semibold text-slate-800 dark:text-gray-200">Validation Questions</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Question 1: Why do you want to guide KCET students? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={question1}
                onChange={(e) => setQuestion1(e.target.value)}
                placeholder="Answer here..."
                rows={2}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Question 2: What makes you suitable to guide students about your college/branch? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={question2}
                onChange={(e) => setQuestion2(e.target.value)}
                placeholder="Answer here..."
                rows={2}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Question 3: What are 3 honest pros and cons of your college? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={question3}
                onChange={(e) => setQuestion3(e.target.value)}
                placeholder="Answer here..."
                rows={2}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Question 4: What mistakes do students commonly make during counselling? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={question4}
                onChange={(e) => setQuestion4(e.target.value)}
                placeholder="Answer here..."
                rows={2}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 shadow transition disabled:opacity-60"
        >
          {submitting ? 'Submitting request...' : 'Submit Meeting Request'}
        </button>
      </form>
    </div>
  )
}
