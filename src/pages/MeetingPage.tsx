import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { meetingService } from '../services/api'
import type { Meeting } from '../types'
import MeetingCard from '../components/MeetingCard'

export default function MeetingPage() {
  const { user, loading: authLoading } = useAuth()
  
  // States for Counselling Student
  const [exploreMeetings, setExploreMeetings] = useState<Meeting[]>([])
  const [registeredMeetings, setRegisteredMeetings] = useState<Meeting[]>([])
  const [counsellingTab, setCounsellingTab] = useState<'explore' | 'registered'>('explore')

  // States for Studying Student
  const [hostedMeetings, setHostedMeetings] = useState<Meeting[]>([])
  const [studyingTab, setStudyingTab] = useState<'upcoming' | 'history'>('upcoming')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && user) {
      loadData()
    }
  }, [authLoading, user])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      if (user?.type_of_student === 'counselling') {
        const [approved, registered] = await Promise.all([
          meetingService.getApproved(),
          meetingService.getRegistered(),
        ])
        setExploreMeetings(approved || [])
        setRegisteredMeetings(registered || [])
      } else if (user?.type_of_student === 'studying') {
        const hosted = await meetingService.getHostMeetings()
        setHostedMeetings(hosted || [])
      }
    } catch (err: any) {
      console.error('Error loading meetings:', err)
      setError('Failed to fetch meeting sessions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (meetingId: string) => {
    try {
      await meetingService.register(meetingId)
      alert('Successfully registered for the session! Confirmation email has been sent.')
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Registration failed')
    }
  }

  const handleJoin = async (meetingId: string) => {
    try {
      const { meetingLink } = await meetingService.join(meetingId)
      if (meetingLink) {
        window.open(meetingLink, '_blank')
        await loadData()
      } else {
        alert('Meeting link is not available yet.')
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Unable to join meeting')
    }
  }

  const isAlreadyRegistered = (meetingId: string) => {
    return registeredMeetings.some((m) => m._id === meetingId)
  }

  const filterStudyingMeetings = () => {
    const now = new Date()
    if (studyingTab === 'upcoming') {
      return hostedMeetings.filter(
        (m) => m.status === 'APPROVED' && new Date(m.endTime) > now
      )
    } else {
      return hostedMeetings.filter(
        (m) => m.status !== 'APPROVED' || new Date(m.endTime) <= now
      )
    }
  }

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          👥 Group Guidance Meetings
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400">
          Connect with peers and experienced seniors for interactive group counselling, sharing advice, and tips.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800 text-sm">
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {!loading && user?.type_of_student === 'counselling' && (
        <div className="space-y-6">
          {/* Counselling Student Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setCounsellingTab('explore')}
              className={`py-3 px-6 font-semibold text-sm border-b-2 transition ${
                counsellingTab === 'explore'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              🔍 Explore Sessions
            </button>
            <button
              onClick={() => setCounsellingTab('registered')}
              className={`py-3 px-6 font-semibold text-sm border-b-2 transition relative ${
                counsellingTab === 'registered'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              🗓️ My Registered Sessions
              {registeredMeetings.length > 0 && (
                <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-600 text-white dark:bg-indigo-500">
                  {registeredMeetings.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Contents */}
          {counsellingTab === 'explore' ? (
            exploreMeetings.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
                <p className="text-slate-500 dark:text-gray-400 text-base mb-2">No upcoming approved meeting sessions available.</p>
                <p className="text-xs text-slate-400 dark:text-gray-500">Check back later for newly scheduled guidance meets.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exploreMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting._id}
                    meeting={meeting}
                    isRegistered={isAlreadyRegistered(meeting._id!)}
                    userRole="counselling"
                    onRegister={() => handleRegister(meeting._id!)}
                    onJoin={() => handleJoin(meeting._id!)}
                  />
                ))}
              </div>
            )
          ) : registeredMeetings.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
              <p className="text-slate-500 dark:text-gray-400 text-base mb-2">You haven't registered for any upcoming meeting sessions.</p>
              <button
                onClick={() => setCounsellingTab('explore')}
                className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow"
              >
                Browse Upcoming Sessions
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {registeredMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting._id}
                  meeting={meeting}
                  isRegistered={true}
                  userRole="counselling"
                  onJoin={() => handleJoin(meeting._id!)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && user?.type_of_student === 'studying' && (
        <div className="space-y-6">
          {/* Studying Student Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setStudyingTab('upcoming')}
              className={`py-3 px-6 font-semibold text-sm border-b-2 transition ${
                studyingTab === 'upcoming'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              🚀 Upcoming Hosted Sessions
            </button>
            <button
              onClick={() => setStudyingTab('history')}
              className={`py-3 px-6 font-semibold text-sm border-b-2 transition ${
                studyingTab === 'history'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              📂 Request History & Completed
            </button>
          </div>

          {/* Tab Contents */}
          {filterStudyingMeetings().length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
              <p className="text-slate-500 dark:text-gray-400 text-base mb-2">
                {studyingTab === 'upcoming'
                  ? 'No upcoming approved group sessions found.'
                  : 'No meeting request history or past sessions found.'}
              </p>
              {studyingTab === 'upcoming' && (
                <p className="text-xs text-slate-400 dark:text-gray-500">
                  Submit a meeting request from your Studying Dashboard to schedule a session.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterStudyingMeetings().map((meeting) => (
                <MeetingCard
                  key={meeting._id}
                  meeting={meeting}
                  isRegistered={false}
                  userRole="studying"
                  onJoin={() => handleJoin(meeting._id!)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
