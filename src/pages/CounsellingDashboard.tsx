import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { counsellingService } from '../services/api'
import type { CounsellingChoice } from '../types'

const CounsellingDashboard = () => {
  const { user } = useAuth()
  const [choices, setChoices] = useState<CounsellingChoice[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  // compute the best display name once
  const displayName = useMemo(() => {
    // 1) if backend sent a name, show first name
    const full = user?.name?.trim();
    if (full) return full;

    // 2) else derive from email (before @), clean dots/underscores/digits
    const username = (user?.email_id || '').split('@')[0] || '';
    // take first token before ., _, or -
    const token = username.split(/[._-]/)[0] || username;
    // strip digits like is23 -> is
    const noDigits = token.replace(/\d+/g, '');
    // capitalize first letter
    if (!noDigits) return 'User';
    return noDigits.charAt(0).toUpperCase() + noDigits.slice(1);
  }, [user]);

  useEffect(() => {
    loadChoices()
  }, [])

  const loadChoices = async () => {
    try {
      const data = await counsellingService.choices.list()
      setChoices(data.sort((a, b) => a.order_of_list - b.order_of_list))
      setHasUnsavedChanges(false)
    } catch (err) {
      console.error('Error loading choices:', err)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null) return

    if (draggedIndex !== index) {
      const newChoices = [...choices]
      const draggedItem = newChoices[draggedIndex]
      newChoices.splice(draggedIndex, 1)
      newChoices.splice(index, 0, draggedItem)
      setChoices(newChoices)
      setDraggedIndex(index)
      setHasUnsavedChanges(true)
    }
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleSaveOrder = async () => {
    setSaving(true)
    try {
      const choicesToUpdate = choices.map((choice, index) => ({
        choice_id: choice.choice_id,
        order_of_list: index + 1,
      }))
      await counsellingService.choices.bulkUpdate(choicesToUpdate)
      await loadChoices()
      alert('Order saved successfully!')
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error saving order')
    } finally {
      setSaving(false)
    }
  }

  const removeChoice = async (choiceId: number) => {
    if (!confirm('Remove this choice?')) return
    try {
      await counsellingService.choices.delete(choiceId)
      await loadChoices()
    } catch {
      alert('Error removing choice')
    }
  }

  const exportChoicesToPdf = async () => {
    if (!choices.length) {
      alert('No choices to export yet')
      return
    }

    setExportingPdf(true)
    try {
      const [{ default: jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ])
      const autoTable = autoTableModule.default
      const doc = new jsPDF({ orientation: 'landscape' })

      doc.setFontSize(16)
      doc.text('KCET Helper - My Personal List', 14, 14)
      doc.setFontSize(10)
      doc.text(`Total choices: ${choices.length}`, 14, 22)

      autoTable(doc, {
        startY: 28,
        head: [['#', 'College', 'Branch', 'Cluster', 'Cutoff']],
        body: choices.map((choice, idx) => [
          idx + 1,
          choice.unique_key_data?.college.college_name || 'N/A',
          choice.unique_key_data?.branch_name || 'N/A',
          choice.unique_key_data?.cluster.cluster_name || 'N/A',
          choice.cutoff || 'N/A',
        ]),
        styles: { halign: 'left' },
        headStyles: { fillColor: [22, 101, 52] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
        },
      })

      // watermark on every page
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i += 1) {
        doc.setPage(i)
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        doc.setTextColor(220, 220, 220)
        doc.setFontSize(48)
        doc.text('KCET-Helper', pageWidth / 2, pageHeight / 2, {
          angle: -30,
          align: 'center',
        })
      }

      doc.save('kcet-helper-choices.pdf')
    } catch (err) {
      console.error('PDF export failed', err)
      alert('Could not generate PDF. Please try again.')
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
      <div className="mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-gray-100">Counselling Dashboard</h1>
        <div className="mt-2">
          <p className="text-sm sm:text-base text-slate-700 dark:text-gray-300">
            <strong>Welcome,</strong> {displayName}
          </p>
          <p className='text-sm sm:text-base text-slate-600 dark:text-gray-400'>
            <strong>Your KCET Rank :</strong> {user?.kcet_rank || <span className="text-red-600 dark:text-red-400">'Not set'</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-8">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-lg shadow-md border border-slate-300 dark:border-slate-700 order-2 md:order-1">
          <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-slate-800 dark:text-gray-100">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              to="/recommendations"
              className="block w-full bg-blue-600 dark:bg-sky-400 text-white px-3 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-sky-500 text-center text-xs sm:text-sm"
            >
              View Recommendations
            </Link>
            <Link
              to="/search"
              className="block w-full bg-slate-600 dark:bg-slate-500 text-white px-3 py-2 rounded-md hover:bg-slate-700 dark:hover:bg-slate-600 text-center text-xs sm:text-sm"
            >
              Search Colleges
            </Link>
            <Link
              to="/meetings"
              className="block w-full bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-center text-xs sm:text-sm"
            >
              Meet Seniors
            </Link>
          </div>
        </div>

        {/* Personal List Table - Takes more space */}
        <div className="md:col-span-3 bg-white dark:bg-slate-800 p-3 sm:p-6 rounded-lg shadow-md border border-slate-300 dark:border-slate-700 order-1 md:order-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-gray-100">
              My Personal List ({choices.length})
            </h2>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={exportChoicesToPdf}
                disabled={exportingPdf}
                className="flex-1 sm:flex-none bg-slate-400 dark:bg-slate-600 border border-slate-700 dark:border-slate-500 text-white px-2 sm:px-3 py-2 rounded-md hover:bg-slate-500 dark:hover:bg-slate-700 text-xs sm:text-sm"
              >
                {exportingPdf ? 'Preparing PDF...' : '⬇️ Download PDF'}
              </button>
              {hasUnsavedChanges && (
                <button
                  onClick={handleSaveOrder}
                  disabled={saving}
                  className="flex-1 sm:flex-none bg-blue-600 dark:bg-sky-400 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-sky-500 disabled:opacity-50 text-xs sm:text-sm"
                >
                  {saving ? 'Saving...' : 'Save Order'}
                </button>
              )}
            </div>
          </div>

          {choices.length === 0 ? (
            <p className="text-sm sm:text-base text-slate-500 dark:text-gray-400">No choices saved yet</p>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <div className="max-h-[20rem] sm:max-h-[37rem] overflow-y-auto min-w-full">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase w-12 sm:w-16">
                        Order
                      </th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase min-w-[120px]">
                        College Name
                      </th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase min-w-[100px]">
                        Branch
                      </th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase min-w-[80px]">
                        Cluster
                      </th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase min-w-[60px]">
                        Cutoff
                      </th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase w-16 sm:w-20">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {choices.map((choice, index) => (
                      <tr
                        key={choice.choice_id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700 cursor-move ${
                          draggedIndex === index ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-900 dark:text-gray-100">
                          {index + 1}
                        </td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-slate-900 dark:text-gray-100">
                          <Link
                            to={`/colleges/${choice.unique_key_data?.college.public_id || ''}`}
                            className="text-blue-600 dark:text-sky-400 hover:text-blue-800 dark:hover:text-sky-300 hover:underline cursor-pointer break-words"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {choice.unique_key_data?.college.college_name || 'N/A'}
                          </Link>
                        </td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-slate-900 dark:text-gray-100">
                          <Link
                            to={`/branches/${choice.unique_key_data?.public_id || ''}`}
                            className="text-blue-600 dark:text-sky-400 hover:text-blue-800 dark:hover:text-sky-300 hover:underline cursor-pointer break-words"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {choice.unique_key_data?.branch_name || 'N/A'}
                          </Link>
                        </td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-slate-900 dark:text-gray-100">
                          {choice.unique_key_data?.cluster.cluster_name || 'N/A'}
                        </td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-slate-900 dark:text-gray-100">
                          {choice.cutoff || 'N/A'}
                        </td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                          <button
                            onClick={() => removeChoice(choice.choice_id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CounsellingDashboard
