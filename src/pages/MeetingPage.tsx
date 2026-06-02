import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { meetingService } from '../services/api'
import type { Meeting } from '../types'

const MeetingPage = () => {
  const { user, loading: authLoading } = useAuth()
  const [requests, setRequests] = useState<Meeting[]>([])
  const [invitations, setInvitations] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Only load meetings if user is authenticated and not loading
    // Also check if we have tokens in localStorage
    const hasTokens = typeof window !== 'undefined' && localStorage.getItem('tokens');
    if (!authLoading && user && hasTokens) {
      loadMeetings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  const loadMeetings = async () => {
    setLoading(true)
    try {
      if (user?.type_of_student === 'counselling') {
        const data = await meetingService.myRequests()
        setRequests(Array.isArray(data) ? data : [])
      } else {
        const data = await meetingService.myInvitations()
        setInvitations(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Error loading meetings:', err)
      // Set empty arrays on error to prevent UI issues
      if (user?.type_of_student === 'counselling') {
        setRequests([])
      } else {
        setInvitations([])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (meetingId: number, status: string) => {
    try {
      await meetingService.updateStatus(meetingId, status)
      await loadMeetings()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error updating meeting status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      case 'completed':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
      case 'cancelled':
        return 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-gray-300'
      default:
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6 text-slate-800 dark:text-gray-100">Meetings</h1>

      {user?.type_of_student === 'counselling' && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-gray-100">My Meeting Requests</h2>
          {loading ? (
            <div className="text-center py-12 text-slate-600 dark:text-gray-400">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md text-center text-slate-500 dark:text-gray-400 border border-slate-300 dark:border-slate-700">
              No meeting requests yet
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(meeting => (
                <div key={meeting.meeting_id} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-slate-300 dark:border-slate-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-gray-100">
                        Meeting with: {meeting.studying_user_id_data?.name || meeting.studying_user_id_data?.email_id || meeting.studying_user_id}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-gray-400">
                        Status: <span className={`px-2 py-1 rounded ${getStatusColor(meeting.status)}`}>
                          {meeting.status}
                        </span>
                      </p>
                      {meeting.scheduled_time && (
                        <p className="text-sm text-slate-600 dark:text-gray-400">
                          Scheduled: {new Date(meeting.scheduled_time).toLocaleString()}
                        </p>
                      )}
                      {meeting.meet_link && meeting.status !== 'completed' && (
                        <a
                          href={meeting.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-sky-400 hover:underline text-sm mt-2 inline-block"
                        >
                          Join Jitsi Meet
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {meeting.status === 'accepted' && (
                        <button
                          onClick={() => handleStatusUpdate(meeting.meeting_id, 'completed')}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          Mark Completed
                        </button>
                      )}
                      {['requested', 'accepted'].includes(meeting.status) && (
                        <button
                          onClick={() => handleStatusUpdate(meeting.meeting_id, 'Cancelled')}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {user?.type_of_student === 'studying' && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-gray-100">Meeting Invitations</h2>
          {loading ? (
            <div className="text-center py-12 text-slate-600 dark:text-gray-400">Loading...</div>
          ) : invitations.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md text-center text-slate-500 dark:text-gray-400 border border-slate-300 dark:border-slate-700">
              No meeting invitations
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map(meeting => (
                <div key={meeting.meeting_id} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-slate-300 dark:border-slate-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-gray-100">
                        Request from: {meeting.counselling_user_id_data?.name || meeting.counselling_user_id_data?.email_id || meeting.counselling_user_id}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-gray-400">
                        Status: <span className={`px-2 py-1 rounded ${getStatusColor(meeting.status)}`}>
                          {meeting.status}
                        </span>
                      </p>
                      {meeting.scheduled_time && (
                        <p className="text-sm text-slate-600 dark:text-gray-400">
                          Scheduled: {new Date(meeting.scheduled_time).toLocaleString()}
                        </p>
                      )}
                      {meeting.meet_link && meeting.status !== 'completed' && (
                        <a
                          href={meeting.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-sky-400 hover:underline text-sm mt-2 inline-block"
                        >
                          Join Jitsi Meet
                        </a>
                      )}
                    </div>
                    {meeting.status === 'requested' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusUpdate(meeting.meeting_id, 'accepted')}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(meeting.meeting_id, 'rejected')}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {meeting.status === 'accepted' && (
                      <button
                        onClick={() => handleStatusUpdate(meeting.meeting_id, 'completed')}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MeetingPage

