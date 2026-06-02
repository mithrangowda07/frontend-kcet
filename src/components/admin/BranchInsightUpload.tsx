import { useCallback, useEffect, useState } from 'react'
import { adminInsightService } from '../../services/api'
import type { AdminCollege, Branch } from '../../types'

type InputMode = 'paste' | 'file'

export default function BranchInsightUpload() {
  const [colleges, setColleges] = useState<AdminCollege[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [collegeId, setCollegeId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [inputMode, setInputMode] = useState<InputMode>('paste')
  const [jsonText, setJsonText] = useState('')
  const [jsonFile, setJsonFile] = useState<File | null>(null)
  const [loadingColleges, setLoadingColleges] = useState(true)
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await adminInsightService.listColleges()
        setColleges(data)
      } catch (err) {
        console.error(err)
        setErrorMessage('Failed to load colleges.')
      } finally {
        setLoadingColleges(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!collegeId) {
      setBranches([])
      setBranchId('')
      return
    }

    const loadBranches = async () => {
      setLoadingBranches(true)
      setBranchId('')
      try {
        const data = await adminInsightService.listBranches(collegeId)
        setBranches(data)
      } catch (err) {
        console.error(err)
        setErrorMessage('Failed to load branches for selected college.')
        setBranches([])
      } finally {
        setLoadingBranches(false)
      }
    }

    loadBranches()
  }, [collegeId])

  const selectedCollege = colleges.find((c) => c.college_id === collegeId)
  const selectedBranch = branches.find((b) => b.unique_key === branchId)

  const handleUpload = useCallback(async () => {
    setValidationErrors([])
    setSuccessMessage('')
    setErrorMessage('')

    if (!collegeId || !branchId) {
      setErrorMessage('Select both college and branch.')
      return
    }

    if (inputMode === 'paste' && !jsonText.trim()) {
      setErrorMessage('Paste JSON content or switch to file upload.')
      return
    }

    if (inputMode === 'file' && !jsonFile) {
      setErrorMessage('Choose a JSON file to upload.')
      return
    }

    setUploading(true)
    setUploadProgress(10)

    try {
      const result = await adminInsightService.upload(
        {
          college_id: collegeId,
          branch_id: branchId,
          json_text: inputMode === 'paste' ? jsonText : undefined,
          json_file: inputMode === 'file' ? jsonFile ?? undefined : undefined,
        },
        (event) => {
          if (event.total) {
            setUploadProgress(Math.min(95, Math.round((event.loaded / event.total) * 100)))
          }
        }
      )
      setUploadProgress(100)
      setSuccessMessage(result.message || 'Branch insight uploaded successfully.')
      setJsonText('')
      setJsonFile(null)
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
      const errors = (response?.validation_errors as string[] | string | undefined) ?? []
      const list = Array.isArray(errors)
        ? errors
        : typeof errors === 'string'
          ? [errors]
          : []
      if (list.length > 0) {
        setValidationErrors(list)
      }
      setErrorMessage(
        (response?.error as string) ||
          (typeof response?.errors === 'object'
            ? 'Validation failed. See details below.'
            : 'Upload failed. Please try again.')
      )
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 1200)
    }
  }, [branchId, collegeId, inputMode, jsonFile, jsonText])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Branch Insight Upload</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Upload JSON that matches the sample schema.{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">college_name</code>{' '}
          and{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">branch_name</code>{' '}
          must match the selected college and branch.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            College
          </label>
          <select
            value={collegeId}
            onChange={(e) => setCollegeId(e.target.value)}
            disabled={loadingColleges || uploading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Select college</option>
            {colleges.map((college) => (
              <option key={college.college_id} value={college.college_id}>
                {college.college_name} ({college.college_code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Branch
          </label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            disabled={!collegeId || loadingBranches || uploading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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

      {selectedCollege && selectedBranch && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Expected JSON names:{' '}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {selectedCollege.college_name}
          </span>{' '}
          /{' '}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {selectedBranch.branch_name}
          </span>
        </p>
      )}

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setInputMode('paste')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            inputMode === 'paste'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          Paste JSON
        </button>
        <button
          type="button"
          onClick={() => setInputMode('file')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            inputMode === 'file'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          Upload File
        </button>
      </div>

      <div className="mt-4">
        {inputMode === 'paste' ? (
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={14}
            placeholder='Paste a single insight object or a one-item array, e.g. [{"college_name":"...","branch_name":"...", ...}]'
            disabled={uploading}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          />
        ) : (
          <input
            type="file"
            accept="application/json,.json"
            disabled={uploading}
            onChange={(e) => setJsonFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 dark:text-slate-300 dark:file:bg-indigo-900/40 dark:file:text-indigo-200"
          />
        )}
      </div>

      {uploadProgress > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Upload progress</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/40">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">Validation errors</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-600 dark:text-red-300">
            {validationErrors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          {successMessage}
        </div>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={uploading}
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? 'Uploading…' : 'Validate & Upload'}
      </button>
    </section>
  )
}
