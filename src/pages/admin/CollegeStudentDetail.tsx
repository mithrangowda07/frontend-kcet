import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adminStudentService } from '../../services/api'
import type { AdminStudentDetail } from '../../types'

export default function CollegeStudentDetail() {
  const { studentId } = useParams<{ studentId: string }>()
  const [student, setStudent] = useState<AdminStudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    try {
      const data = await adminStudentService.detail(studentId)
      setStudent(data)
    } catch {
      setError('Student not found.')
      setStudent(null)
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    load()
  }, [load])

  const handleApprove = async () => {
    if (!studentId) return
    setActionLoading(true)
    setError('')
    setMessage('')
    try {
      const result = await adminStudentService.approve(studentId)
      setMessage(result.message)
      await load()
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to approve student.'
      )
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (event: FormEvent) => {
    event.preventDefault()
    if (!studentId || !rejectReason.trim()) return
    setActionLoading(true)
    setError('')
    setMessage('')
    try {
      const result = await adminStudentService.reject(studentId, rejectReason.trim())
      setMessage(result.message)
      setShowRejectModal(false)
      setRejectReason('')
      await load()
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to reject student.'
      )
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <p className="text-slate-500">Loading student details…</p>
  }

  if (!student) {
    return (
      <div>
        <p className="text-red-600 dark:text-red-400">{error || 'Student not found.'}</p>
        <Link to="/admin/students/approvals" className="mt-4 inline-block text-indigo-600">
          Back to list
        </Link>
      </div>
    )
  }

  const viewUrl = student.id_card_view_url || student.id_card_url
  const downloadUrl = student.id_card_download_url || student.id_card_url
  const isPdf = viewUrl?.toLowerCase().includes('.pdf')

  return (
    <div>
      <Link
        to="/admin/students/approvals"
        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
      >
        ← Back to approvals
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{student.name}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">{student.email_id}</p>

      {message && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Registration details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ['Name', student.name],
              ['Email', student.email_id],
              ['Phone', student.phone_number],
              ['College', student.college_name],
              ['Department', student.department],
              ['Year', student.year_of_starting],
              ['USN', student.usn],
              ['Category', student.category || '—'],
              [
                'Registration date',
                student.created_at ? new Date(student.created_at).toLocaleString() : '—',
              ],
              ['Status', student.approval_status],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                <dd className="text-right font-medium text-slate-900 dark:text-white">{value}</dd>
              </div>
            ))}
          </dl>
          {student.rejection_reason && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              Rejection reason: {student.rejection_reason}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Uploaded Student ID Card</h2>
          {viewUrl ? (
            <div className="mt-4 space-y-4">
              {!isPdf && (
                <img
                  src={viewUrl}
                  alt="Student ID card"
                  className="max-h-80 w-full rounded-lg border border-slate-200 object-contain dark:border-slate-700"
                />
              )}
              <div className="flex flex-wrap gap-3">
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  View ID Card
                </a>
                <a
                  href={downloadUrl}
                  download
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-200"
                >
                  Download ID Card
                </a>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No ID card uploaded.</p>
          )}
        </section>
      </div>

      {student.approval_status === 'PENDING' && (
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={actionLoading}
            onClick={handleApprove}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => setShowRejectModal(true)}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            Reject
          </button>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleReject}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Reject registration</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Provide a reason. The student will receive this in an email.
            </p>
            <textarea
              required
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              placeholder="Rejection reason"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !rejectReason.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Confirm reject
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
