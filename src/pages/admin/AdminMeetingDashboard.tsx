import { useState, useEffect } from 'react'
import { meetingService, adminInsightService } from '../../services/api'
import type { Meeting, AdminCollege, Branch } from '../../types'

type AdminTab = 'pending' | 'create' | 'history'
type HistoryStatus = 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED'

export default function AdminMeetingDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('pending')
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>('APPROVED')

  // Data states
  const [pendingMeetings, setPendingMeetings] = useState<Meeting[]>([])
  const [historyMeetings, setHistoryMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Direct Creation form states
  const [collegesList, setCollegesList] = useState<AdminCollege[]>([])
  const [branchesList, setBranchesList] = useState<Branch[]>([])
  const [selectedCollegeId, setSelectedCollegeId] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [loadingColleges, setLoadingColleges] = useState(false)
  const [loadingBranches, setLoadingBranches] = useState(false)
  
  const [admissionTypeFocus, setAdmissionTypeFocus] = useState('KCET')
  const [meetingCapacity, setMeetingCapacity] = useState(25)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [rawTags, setRawTags] = useState('')

  // Approval/Rejection action modals states
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  
  // Modal Inputs
  const [modalCapacity, setModalCapacity] = useState(25)
  const [modalLink, setModalLink] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  const [submittingAction, setSubmittingAction] = useState(false)

  useEffect(() => {
    loadData()
  }, [activeTab, historyStatus])

  useEffect(() => {
    if (activeTab === 'create' && collegesList.length === 0) {
      const fetchColleges = async () => {
        setLoadingColleges(true)
        try {
          const data = await adminInsightService.listColleges()
          setCollegesList(data || [])
        } catch (err) {
          console.error('Error fetching colleges:', err)
        } finally {
          setLoadingColleges(false)
        }
      }
      fetchColleges()
    }
  }, [activeTab, collegesList.length])

  useEffect(() => {
    const fetchBranches = async () => {
      if (!selectedCollegeId) {
        setBranchesList([])
        return
      }
      setLoadingBranches(true)
      try {
        const data = await adminInsightService.listBranches(selectedCollegeId)
        setBranchesList(data || [])
      } catch (err) {
        console.error('Error fetching branches:', err)
      } finally {
        setLoadingBranches(false)
      }
    }
    fetchBranches()
  }, [selectedCollegeId])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      if (activeTab === 'pending') {
        const data = await meetingService.adminGetPending()
        setPendingMeetings(data || [])
      } else if (activeTab === 'history') {
        const data = await meetingService.adminGetHistory(historyStatus)
        setHistoryMeetings(data || [])
      }
    } catch (err: any) {
      console.error(err)
      setError('Failed to load meeting data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const selectedCollege = collegesList.find((c) => c.college_id === selectedCollegeId)
    const selectedBranch = branchesList.find((b) => b.unique_key === selectedBranchId)

    if (!selectedCollege || !selectedBranch || !startTime || !endTime || !meetingLink) {
      setError('All fields except tags are required')
      return
    }

    const start = new Date(startTime)
    const end = new Date(endTime)
    if (end <= start) {
      setError('End time must be after start time')
      return
    }

    const tags = rawTags
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean)

    setLoading(true)
    try {
      await meetingService.adminCreate({
        collegeFocus: selectedCollege.college_name,
        branchFocus: selectedBranch.branch_name,
        admissionTypeFocus,
        meetingCapacity,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        meetingLink,
        tags,
      })
      alert('Direct meeting created successfully!')
      // Clear form
      setSelectedCollegeId('')
      setSelectedBranchId('')
      setStartTime('')
      setEndTime('')
      setMeetingLink('')
      setRawTags('')
      setActiveTab('history')
      setHistoryStatus('APPROVED')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Direct meeting creation failed')
    } finally {
      setLoading(false)
    }
  }

  const openActionModal = (meeting: Meeting, type: 'approve' | 'reject') => {
    setSelectedMeeting(meeting)
    setActionType(type)
    setModalCapacity(25)
    setModalLink(meeting.meetingLink || '')
    setRejectionReason('')
  }

  const closeActionModal = () => {
    setSelectedMeeting(null)
    setActionType(null)
  }

  const submitModalAction = async () => {
    if (!selectedMeeting) return
    setSubmittingAction(true)
    try {
      if (actionType === 'approve') {
        if (!modalLink) {
          alert('Meeting link is required for approval')
          setSubmittingAction(false)
          return
        }
        await meetingService.adminApprove(selectedMeeting._id!, {
          meetingCapacity: modalCapacity,
          meetingLink: modalLink,
        })
        alert('Meeting request approved successfully!')
      } else if (actionType === 'reject') {
        if (!rejectionReason) {
          alert('Rejection reason is required')
          setSubmittingAction(false)
          return
        }
        await meetingService.adminReject(selectedMeeting._id!, {
          rejectionReason,
        })
        alert('Meeting request rejected.')
      }
      closeActionModal()
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Action failed')
    } finally {
      setSubmittingAction(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Meetings Administration</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Approve requests, schedule direct group sessions, and review historical records.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-lg border border-red-200 dark:border-red-800">
          ⚠️ {error}
        </div>
      )}

      {/* Main Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition ${
            activeTab === 'pending'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          📥 Pending Requests ({pendingMeetings.length})
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition ${
            activeTab === 'create'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          ➕ Create Direct Meeting
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`py-2 px-4 font-semibold text-sm border-b-2 transition ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          📂 Meeting History
        </button>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {/* Tab Contents */}
      {!loading && activeTab === 'pending' && (
        pendingMeetings.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            No pending meeting requests at the moment.
          </div>
        ) : (
          <div className="space-y-6">
            {pendingMeetings.map((meeting) => {
              const hostName = meeting.hostUserId && typeof meeting.hostUserId === 'object'
                ? meeting.hostUserId.name || meeting.hostUserId.email_id
                : meeting.hostUserId || 'Unknown Student'
              const hostEmail = meeting.hostUserId && typeof meeting.hostUserId === 'object'
                ? meeting.hostUserId.email_id
                : ''
              const hostPhone = meeting.hostUserId && typeof meeting.hostUserId === 'object'
                ? meeting.hostUserId.phone_number
                : ''

              return (
                <div key={meeting._id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 space-y-4">
                  {/* Title & Badge Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                    <div>
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                        🛡️ {meeting.verificationBadge}
                      </span>
                      <h2 className="text-lg font-bold text-slate-800 dark:text-white mt-2">
                        {meeting.collegeName} &bull; <span className="text-indigo-600 dark:text-sky-400 font-semibold">{meeting.branchName}</span>
                      </h2>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => openActionModal(meeting, 'approve')}
                        className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow transition"
                      >
                        Approve Request
                      </button>
                      <button
                        onClick={() => openActionModal(meeting, 'reject')}
                        className="flex-1 sm:flex-none px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg shadow transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  {/* Meeting Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                    <div>
                      <strong className="text-slate-400 dark:text-slate-500 uppercase block tracking-wider">Host Student</strong>
                      <p className="font-semibold text-slate-700 dark:text-gray-200 mt-1">{hostName}</p>
                      {hostEmail && <p className="text-slate-500 mt-0.5">{hostEmail}</p>}
                      {hostPhone && <p className="text-slate-500 mt-0.5">Ph: {hostPhone}</p>}
                    </div>
                    <div>
                      <strong className="text-slate-400 dark:text-slate-500 uppercase block tracking-wider">Timings</strong>
                      <p className="font-semibold text-slate-700 dark:text-gray-200 mt-1">
                        {new Date(meeting.startTime).toLocaleString()}
                      </p>
                      <p className="text-slate-500 mt-0.5">to {new Date(meeting.endTime).toLocaleTimeString()}</p>
                    </div>
                    <div>
                      <strong className="text-slate-400 dark:text-slate-500 uppercase block tracking-wider">Admission & Rank</strong>
                      <p className="font-semibold text-slate-700 dark:text-gray-200 mt-1">Type: {meeting.admissionType}</p>
                      <p className="text-slate-500 mt-0.5">Rank: {meeting.kcetRank}</p>
                    </div>
                    <div>
                      <strong className="text-slate-400 dark:text-slate-500 uppercase block tracking-wider">Languages</strong>
                      <p className="font-semibold text-slate-700 dark:text-gray-200 mt-1">{meeting.languages?.join(', ')}</p>
                      <p className="text-slate-500 mt-0.5">Default Capacity: {meeting.meetingCapacity}</p>
                    </div>
                  </div>

                  {/* Questionnaire Answers */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-sky-400">Questionnaire Answers</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 dark:text-slate-300">
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded border border-slate-100 dark:border-slate-800">
                        <strong className="text-slate-600 dark:text-slate-400 block mb-1">1. Why guide KCET students?</strong>
                        <p className="leading-relaxed italic">"{meeting.question1}"</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded border border-slate-100 dark:border-slate-800">
                        <strong className="text-slate-600 dark:text-slate-400 block mb-1">2. Suitability regarding branch/college?</strong>
                        <p className="leading-relaxed italic">"{meeting.question2}"</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded border border-slate-100 dark:border-slate-800">
                        <strong className="text-slate-600 dark:text-slate-400 block mb-1">3. Honest college pros & cons?</strong>
                        <p className="leading-relaxed italic">"{meeting.question3}"</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded border border-slate-100 dark:border-slate-800">
                        <strong className="text-slate-600 dark:text-slate-400 block mb-1">4. Common counselling mistakes?</strong>
                        <p className="leading-relaxed italic">"{meeting.question4}"</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Direct Creation form tab */}
      {!loading && activeTab === 'create' && (
        <form onSubmit={handleCreateMeeting} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Schedule direct Group Session (Admin Created)</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create an instantly-approved meeting session focused on specific college and branch targets.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                College Focus {loadingColleges && <span className="text-indigo-500 animate-pulse">(Loading...)</span>}
              </label>
              <select
                value={selectedCollegeId}
                onChange={(e) => {
                  setSelectedCollegeId(e.target.value)
                  setSelectedBranchId('')
                }}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              >
                <option value="">-- Select Target College --</option>
                {collegesList.map((college) => (
                  <option key={college.college_id} value={college.college_id}>
                    {college.college_name} ({college.college_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Branch Focus {loadingBranches && <span className="text-indigo-500 animate-pulse">(Loading...)</span>}
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!selectedCollegeId || loadingBranches}
                required
              >
                <option value="">
                  {!selectedCollegeId ? '-- Select College First --' : '-- Select Target Branch --'}
                </option>
                {branchesList.map((branch) => (
                  <option key={branch.unique_key} value={branch.unique_key}>
                    {branch.branch_name} ({branch.branch_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Admission Focus</label>
              <select
                value={admissionTypeFocus}
                onChange={(e) => setAdmissionTypeFocus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="KCET">KCET</option>
                <option value="COMEDK">COMEDK</option>
                <option value="Management">Management</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Capacity</label>
              <select
                value={meetingCapacity}
                onChange={(e) => setMeetingCapacity(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={75}>75</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Start Date & Time</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">End Date & Time</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Meeting Call URL</label>
              <input
                type="url"
                placeholder="e.g. Jitsi or Google Meet URL"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Custom Tags (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. RVCE, CSE, KCET"
                value={rawTags}
                onChange={(e) => setRawTags(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 shadow transition"
          >
            Create & Publish Meeting
          </button>
        </form>
      )}

      {/* History Tabs */}
      {!loading && activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex border-b border-slate-200 dark:border-slate-700 gap-1.5 text-xs font-semibold">
            {(['APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'] as HistoryStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setHistoryStatus(status)}
                className={`py-1.5 px-3 rounded-lg border transition ${
                  historyStatus === status
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-indigo-600 dark:text-sky-400'
                    : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {historyMeetings.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
              No meetings found with status: <strong>{historyStatus}</strong>.
            </div>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-xs">
                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 uppercase font-medium">
                  <tr>
                    <th className="px-6 py-3 text-left">College & Branch</th>
                    <th className="px-6 py-3 text-left">Host</th>
                    <th className="px-6 py-3 text-left">Timing</th>
                    <th className="px-6 py-3 text-left">Capacity</th>
                    <th className="px-6 py-3 text-left">Badges / Link</th>
                    {historyStatus === 'REJECTED' && <th className="px-6 py-3 text-left">Rejection Reason</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                  {historyMeetings.map((meeting) => {
                    const hostName = meeting.hostUserId && typeof meeting.hostUserId === 'object'
                      ? meeting.hostUserId.name || meeting.hostUserId.email_id
                      : 'Admin Created'
                    return (
                      <tr key={meeting._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 align-top">
                          <p className="font-bold">{meeting.collegeName}</p>
                          <p className="text-slate-500 font-semibold">{meeting.branchName}</p>
                        </td>
                        <td className="px-6 py-4 align-top font-medium">{hostName}</td>
                        <td className="px-6 py-4 align-top">
                          <p>{new Date(meeting.startTime).toLocaleString()}</p>
                          <p className="text-slate-500">to {new Date(meeting.endTime).toLocaleTimeString()}</p>
                        </td>
                        <td className="px-6 py-4 align-top font-semibold">
                          {meeting.registeredCount} / {meeting.meetingCapacity}
                        </td>
                        <td className="px-6 py-4 align-top space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 text-[10px]">
                            {meeting.verificationBadge}
                          </span>
                          {meeting.meetingLink && (
                            <a
                              href={meeting.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-indigo-600 dark:text-sky-400 hover:underline font-semibold"
                            >
                              Open Call Link
                            </a>
                          )}
                        </td>
                        {historyStatus === 'REJECTED' && (
                          <td className="px-6 py-4 align-top text-rose-600 dark:text-rose-400 italic">
                            "{meeting.rejectionReason || 'No details provided'}"
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Approve/Reject Modals */}
      {selectedMeeting && actionType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white capitalize">
              {actionType} Group Meeting Request
            </h3>
            
            <p className="text-xs text-slate-500">
              For request from {selectedMeeting.collegeName} &bull; {selectedMeeting.branchName}
            </p>

            {actionType === 'approve' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Set Capacity Limit</label>
                  <select
                    value={modalCapacity}
                    onChange={(e) => setModalCapacity(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={75}>75</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Meeting Link (Jitsi/Meet)</label>
                  <input
                    type="url"
                    placeholder="https://meet.jit.si/..."
                    value={modalLink}
                    onChange={(e) => setModalLink(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>
            )}

            {actionType === 'reject' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Rejection Reason</label>
                <textarea
                  placeholder="Enter rejection explanation to send to the student..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={closeActionModal}
                disabled={submittingAction}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={submitModalAction}
                disabled={submittingAction}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow"
              >
                {submittingAction ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
