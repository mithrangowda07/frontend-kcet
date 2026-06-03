import { useState, useEffect } from 'react'
import type { Meeting } from '../types'

interface MeetingCardProps {
  meeting: Meeting
  isRegistered?: boolean
  userRole?: 'counselling' | 'studying' | 'admin'
  onRegister?: () => void
  onJoin?: () => void
}

export default function MeetingCard({
  meeting,
  isRegistered = false,
  userRole = 'counselling',
  onRegister,
  onJoin,
}: MeetingCardProps) {
  const [canJoin, setCanJoin] = useState(false)
  const [deadlinePassed, setDeadlinePassed] = useState(false)

  const {
    collegeName,
    branchName,
    verificationBadge,
    startTime,
    endTime,
    registrationDeadline,
    meetingCapacity,
    registeredCount,
    tags,
    languages,
    hostUserId,
    createdByRole,
  } = meeting

  const hostName =
    createdByRole === 'ADMIN'
      ? 'Administrator'
      : hostUserId && typeof hostUserId === 'object'
      ? hostUserId.name || hostUserId.email_id
      : 'Senior Peer Advisor'

  useEffect(() => {
    const checkStatus = () => {
      const now = new Date()
      const start = new Date(startTime)
      const end = new Date(endTime)
      const deadline = new Date(registrationDeadline)

      // Can join starting 10 minutes before start time and before end time
      const tenMinsBeforeStart = new Date(start.getTime() - 10 * 60 * 1000)
      setCanJoin(now >= tenMinsBeforeStart && now <= end)

      // Registration deadline passed
      setDeadlinePassed(now >= deadline)
    }

    checkStatus()
    const interval = setInterval(checkStatus, 30000) // check every 30 seconds
    return () => clearInterval(interval)
  }, [startTime, endTime, registrationDeadline])

  const progressPercentage = Math.min(100, Math.round((registeredCount / meetingCapacity) * 100))
  const isFull = registeredCount >= meetingCapacity

  return (
    <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col justify-between hover:shadow-lg transition-shadow">
      {/* Dynamic Header / Badge */}
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start">
        <div>
          <span className="inline-flex items-center gap-1 rounded bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
            🛡️ {verificationBadge || 'Verified Session'}
          </span>
        </div>
        <div className="text-right">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              meeting.status === 'COMPLETED'
                ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                : 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
            }`}
          >
            {meeting.status}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-gray-100 mb-1">
            {collegeName}
          </h3>
          <p className="text-sm font-semibold text-indigo-600 dark:text-sky-400 mb-3">
            Branch: {branchName}
          </p>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 mb-4">
            <p className="flex items-center gap-2">
              <span>👤</span> <strong>Speaker:</strong> {hostName}
            </p>
            <p className="flex items-center gap-2">
              <span>🕒</span> <strong>Timings:</strong>{' '}
              {new Date(startTime).toLocaleString()} - {new Date(endTime).toLocaleTimeString()}
            </p>
            {languages && languages.length > 0 && (
              <p className="flex items-center gap-2">
                <span>🗣️</span> <strong>Languages:</strong> {languages.join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Capacity status and tags */}
        <div>
          {/* Capacity Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Registered Capacity</span>
              <span className="font-bold text-slate-700 dark:text-gray-200">
                {registeredCount} / {meetingCapacity} Registered
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  progressPercentage >= 90
                    ? 'bg-rose-500'
                    : progressPercentage >= 50
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="bg-slate-50 dark:bg-slate-900/30 p-4 border-t border-slate-100 dark:border-slate-700/80 flex flex-col gap-2">
        {userRole === 'counselling' && (
          <>
            {!isRegistered ? (
              <button
                onClick={onRegister}
                disabled={deadlinePassed || isFull || meeting.status === 'COMPLETED'}
                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 text-sm shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {meeting.status === 'COMPLETED'
                  ? 'Meeting Finished'
                  : isFull
                  ? 'Capacity Reached'
                  : deadlinePassed
                  ? 'Registration Closed'
                  : 'Register for Meeting'}
              </button>
            ) : (
              <div className="w-full flex flex-col gap-1.5">
                <span className="text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold block mb-1">
                  ✓ Registered & Confirmed
                </span>
                <button
                  onClick={onJoin}
                  disabled={!canJoin}
                  className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 text-sm shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {canJoin ? 'Join Meeting' : 'Join Link Opens 10m Before Start'}
                </button>
              </div>
            )}
          </>
        )}

        {(userRole === 'studying' || userRole === 'admin') && (
          <div className="w-full text-center">
            {meeting.meetingLink ? (
              <button
                onClick={onJoin}
                disabled={!canJoin}
                className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 text-sm shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {canJoin ? 'Join Meeting (Host)' : 'Meeting Active 10m Before Start'}
              </button>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                Link will be generated/approved by administrator
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
