import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { counsellingService, categoryService, clusterService } from '../services/api'
import type { Recommendation, Category, Cluster, CounsellingChoice } from '../types'

const Recommendations = () => {
  const { user } = useAuth()

  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [choices, setChoices] = useState<CounsellingChoice[]>([])

  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState<Category[]>([])

  const [clusters, setClusters] = useState<Cluster[]>([])
  const [selectedCluster, setSelectedCluster] = useState('')

  const [year, setYear] = useState('2025')
  const [round, setRound] = useState('R1')

  const [openingRank, setOpeningRank] = useState(0)
  const [closingRank, setClosingRank] = useState(0)

  /* ---------------- Display Name ---------------- */
  const displayName = useMemo(() => {
    const full = user?.name?.trim()
    if (full) return full

    const username = (user?.email_id || '').split('@')[0]
    const token = username.split(/[._-]/)[0].replace(/\d+/g, '')
    return token ? token.charAt(0).toUpperCase() + token.slice(1) : 'User'
  }, [user])

  /* ---------------- Load Metadata ---------------- */
  const loadCategories = async () => {
    try {
      setCategories(await categoryService.list())
    } catch {
      const { HARDCODED_CATEGORIES } = await import('../data/categories')
      setCategories(HARDCODED_CATEGORIES || [])
    }
  }

  const loadClusters = async () => {
    try {
      setClusters(await clusterService.list())
    } catch {
      setClusters([])
    }
  }

  const loadChoices = async () => {
    try {
      const data = await counsellingService.choices.list()
      setChoices(data)
    } catch (err) {
      console.error('Error loading choices:', err)
    }
  }

  /* ---------------- Initial Setup ---------------- */
  useEffect(() => {
    loadCategories()
    loadClusters()
    loadChoices()

    if (user?.category) setCategory(user.category)

    if (user?.kcet_rank) {
      const rank = user.kcet_rank
      let open = 0
      let close = 0

      if (rank <= 1000) {
        open = Math.floor(rank * 0.35023)
        close = Math.floor(rank * 3.5782)
      } else if (rank <= 5000) {
        open = Math.floor(rank * 0.40124)
        close = Math.floor(rank * 3.012568)
      } else if (rank <= 20000) {
        open = Math.floor(rank * 0.45123)
        close = Math.floor(rank * 2.058123)
      } else if (rank <= 35000) {
        open = Math.floor(rank * 0.55125)
        close = Math.floor(rank * 1.816358)
      } else if (rank <= 50000) {
        open = Math.floor(rank * 0.601236)
        close = Math.floor(rank * 1.6136524)
      } else {
        open = Math.floor(rank * 0.70265)
        close = Math.floor(rank * 1.412486)
      }

      setOpeningRank(open)
      setClosingRank(close)
    }
  }, [user])

  /* ---------------- Fetch Recommendations ---------------- */
  const loadRecommendations = async () => {
    if (!user?.kcet_rank) return alert('Please set your KCET rank first')
    if (!openingRank || !closingRank) return alert('Set opening and closing ranks')

    setLoading(true)
    try {
      const data = await counsellingService.recommendations(
        user.kcet_rank,
        category || undefined,
        year,
        round,
        selectedCluster || undefined,
        openingRank,
        closingRank
      )
      setRecommendations(data.recommendations)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error loading recommendations')
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- Auto Refresh (Debounced) ---------------- */
  useEffect(() => {
    if (user?.kcet_rank && openingRank && closingRank) {
      const t = setTimeout(loadRecommendations, 300)
      return () => clearTimeout(t)
    }
  }, [category, year, round, selectedCluster, openingRank, closingRank])

  /* ---------------- Add Choice ---------------- */
  const addToChoices = async (id: string) => {
    try {
      await counsellingService.choices.create(id)
      alert('Added to your choices!')
      // Reload choices to update the UI
      loadChoices()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error adding choice')
    }
  }

  /* ---------------- Check if Already in Choices ---------------- */
  const isInChoices = (publicId: string): boolean => {
    return choices.some(choice => choice.unique_key_data?.public_id === publicId)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* ---------------- Header ---------------- */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-gray-100">
          College Recommendation
        </h1>
        <p className="text-slate-600 dark:text-gray-400">
          Welcome, <strong>{displayName}</strong>
        </p>
        <p className="text-slate-600 dark:text-gray-400">
          KCET Rank:{' '}
          <strong>{user?.kcet_rank ?? 'Not set'}</strong>
        </p>
      </div>

      {/* ---------------- Card ---------------- */}
      <div className="bg-white dark:bg-slate-900/70 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">

        {/* -------- Filters -------- */}
        <div className="flex flex-nowrap gap-4 items-end overflow-x-auto mb-6
                        bg-slate-50 dark:bg-slate-800
                        rounded-lg px-4 py-3">

          <Filter label="Category">
            <select value={category} onChange={e => setCategory(e.target.value)} className=" pr-8 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200">
                
              <option value="">All</option>
              {categories.map(c => (
                <option key={c.category}>{c.category}</option>
              ))}
            </select>
          </Filter>

          <Filter label="Year">
            <select value={year} onChange={e => setYear(e.target.value)} className=" pr-8 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200">
              {['2025', '2024', '2023', '2022'].map(y => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </Filter>

          <Filter label="Round">
            <select value={round} onChange={e => setRound(e.target.value)} className=" pr-8 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200">
              <option value="R1">Round 1</option>
              <option value="R2">Round 2</option>
              <option value="R3">Round 3</option>
            </select>
          </Filter>

          <Filter label="Cluster">
            <select
              value={selectedCluster}
              onChange={e => setSelectedCluster(e.target.value)}
              className=" pr-8 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200"
            >
              <option value="">All</option>
              {clusters.map(c => (
                <option key={c.cluster_code} value={c.cluster_code}>
                  {c.cluster_name}
                </option>
              ))}
            </select>
          </Filter>
              
          <Filter label="Opening Rank">
            <input
              type="number"
              value={openingRank}
              onChange={e => setOpeningRank(+e.target.value)}
              className="pr-2 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200"
            />
          </Filter>

          <Filter label="Closing Rank">
            <input
              type="number"
              value={closingRank}
              onChange={e => setClosingRank(+e.target.value)}
              className="pr-2 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200"
            />
          </Filter>

          <button
            onClick={loadRecommendations}
            disabled={loading}
            className="bg-blue-600 dark:bg-sky-400 text-white px-4 py-2 rounded-md text-sm
                       hover:bg-blue-700 dark:hover:bg-sky-500 transition disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {/* -------- Table -------- */}
        {recommendations.length === 0 ? (
          <p className="text-slate-500 dark:text-gray-400">
            {loading ? 'Loading recommendations…' : 'No recommendations found'}
          </p>
        ) : (
          <div className="overflow-x-auto max-h-[50em]">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-slate-600 dark:text-gray-400">College</th>
                  <th className="px-6 py-3 text-left text-slate-600 dark:text-gray-400">Branch</th>
                  <th className="px-6 py-3 text-left text-slate-600 dark:text-gray-400">{round} Cutoff</th>
                  <th className="px-6 py-3 text-left text-slate-600 dark:text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700
                                text-slate-800 dark:text-slate-200">
                {recommendations.map(r => (
                  <tr
                    key={r.public_id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <Link
                        to={`/colleges/${r.college.public_id}`}
                        className="text-blue-600 dark:text-sky-400
                                   hover:text-blue-800 dark:hover:text-sky-300
                                   hover:underline cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.college.college_name}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        to={`/branches/${r.public_id}`}
                        className="text-blue-600 dark:text-sky-400
                                   hover:text-blue-800 dark:hover:text-sky-300
                                   hover:underline cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.branch.branch_name}
                      </Link>
                    </td>
                    <td className="px-6 py-3">{r.cutoff}</td>
                    <td className="px-6 py-3">
                      {isInChoices(r.public_id) ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                          Added
                        </span>
                      ) : (
                        <button
                          onClick={() => addToChoices(r.public_id)}
                          className="text-blue-600 dark:text-sky-400
                                     hover:text-blue-800 dark:hover:text-sky-300
                                     hover:underline"
                        >
                          Add to choices
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------- Reusable Filter Block ---------------- */
const Filter = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-slate-500 dark:text-gray-400">
      {label}
    </label>
    {children}
  </div>
)

export default Recommendations