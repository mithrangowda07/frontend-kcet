import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { counsellingService, categoryService, clusterService, collegeService, getUserId } from '../services/api'
import { cache } from '../utils/cache'
import type { Recommendation, Category, Cluster, CounsellingChoice } from '../types'
import { useRecommendationsTour } from '../hooks/useRecommendationsTour'

const Recommendations = () => {
  const { user } = useAuth()

  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [choices, setChoices] = useState<CounsellingChoice[]>([])

  const [category, setCategory] = useState(user?.category || 'GM')
  const [categories, setCategories] = useState<Category[]>([])

  const [clusters, setClusters] = useState<Cluster[]>([])
  const [selectedClusters, setSelectedClusters] = useState<string[]>(['all'])
  const [isClusterDropdownOpen, setIsClusterDropdownOpen] = useState(false)
  const clusterDropdownRef = useRef<HTMLDivElement>(null)
  const mobileClusterDropdownRef = useRef<HTMLDivElement>(null)

  const [locations, setLocations] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>(['all'])
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
  const locationDropdownRef = useRef<HTMLDivElement>(null)
  const mobileLocationDropdownRef = useRef<HTMLDivElement>(null)

  const [year, setYear] = useState('2025')
  const [round, setRound] = useState('R1')

  const [openingRank, setOpeningRank] = useState<number | ''>('')
  const [closingRank, setClosingRank] = useState<number | ''>('')
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false)

  // Mobile collapsed filter state
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(true)

  const { startTour } = useRecommendationsTour({
    setIsFiltersCollapsed,
    hasRecommendations: recommendations.length > 0,
    isInitialLoad: !hasInitialLoaded
  })

  // Mobile expanded recommendation cards state
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  // Floating scroll-to-top button state
  const [showScrollTop, setShowScrollTop] = useState(false)

  const toggleCardExpand = (publicId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(publicId)) {
        next.delete(publicId)
      } else {
        next.add(publicId)
      }
      return next
    })
  }

  // Scroll listener for floating scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Ref-based outside click handler for Cluster and Location Dropdowns (Desktop & Mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const clickedOutsideCluster =
        (!clusterDropdownRef.current || !clusterDropdownRef.current.contains(event.target as Node)) &&
        (!mobileClusterDropdownRef.current || !mobileClusterDropdownRef.current.contains(event.target as Node));
      
      if (clickedOutsideCluster) {
        setIsClusterDropdownOpen(false)
      }

      const clickedOutsideLocation =
        (!locationDropdownRef.current || !locationDropdownRef.current.contains(event.target as Node)) &&
        (!mobileLocationDropdownRef.current || !mobileLocationDropdownRef.current.contains(event.target as Node));
      
      if (clickedOutsideLocation) {
        setIsLocationDropdownOpen(false)
        setLocationSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Bulk add states
  const [selectedPublicIds, setSelectedPublicIds] = useState<Set<string>>(new Set())
  const [bulkAdding, setBulkAdding] = useState(false)
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean
    isSelectedOnly: boolean
    totalVisible: number
    alreadyAdded: number
    willAdd: number
  } | null>(null)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [resultModalData, setResultModalData] = useState<{ added: number; skipped: number; failed: number } | null>(null)

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

  const loadLocations = async () => {
    try {
      setLocations(await collegeService.getLocations())
    } catch {
      setLocations([])
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
    loadLocations()
    loadChoices()

    setCategory(user?.category || 'GM')

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
  const loadRecommendations = async (bypassCache = false) => {
    if (!user?.kcet_rank) return alert('Please set your KCET rank first')
    if (openingRank === '' || closingRank === '' || Number(openingRank) <= 0 || Number(closingRank) <= 0) {
      return alert('Ranks must be positive numbers')
    }
    if (Number(openingRank) >= Number(closingRank)) {
      return alert('Opening rank must be less than closing rank')
    }

    setLoading(true)
    try {
      const data = await counsellingService.recommendations(
        user.kcet_rank,
        category || undefined,
        year,
        round,
        selectedClusters.includes('all') || selectedClusters.length === 0 ? undefined : selectedClusters,
        Number(openingRank),
        Number(closingRank),
        selectedLocations.includes('all') || selectedLocations.length === 0 ? undefined : selectedLocations,
        bypassCache
      )
      setRecommendations(data.recommendations)
      if (data.closing_rank && data.closing_rank !== closingRank) {
        setClosingRank(data.closing_rank)
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error loading recommendations')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleCluster = (code: string) => {
    const allCodes = clusters.map(c => c.cluster_code || (c as any)._id)

    if (code === 'all') {
      if (selectedClusters.includes('all')) {
        setSelectedClusters([])
      } else {
        setSelectedClusters(['all'])
      }
      return
    }

    let next: string[]
    if (selectedClusters.includes('all')) {
      next = allCodes.filter(c => c !== code)
    } else {
      if (selectedClusters.includes(code)) {
        next = selectedClusters.filter(c => c !== code)
      } else {
        next = [...selectedClusters, code]
      }
    }

    const containsAllIndividual = allCodes.every(c => next.includes(c))
    if (containsAllIndividual && allCodes.length > 0) {
      setSelectedClusters(['all'])
    } else {
      setSelectedClusters(next)
    }
  }

  const handleRemoveCluster = (code: string) => {
    if (code === 'all') {
      setSelectedClusters([])
    } else {
      setSelectedClusters(prev => prev.filter(c => c !== code))
    }
  }

  const handleToggleLocation = (loc: string) => {
    const allLocs = locations

    if (loc === 'all') {
      if (selectedLocations.includes('all')) {
        setSelectedLocations([])
      } else {
        setSelectedLocations(['all'])
      }
      return
    }

    let next: string[]
    if (selectedLocations.includes('all')) {
      next = allLocs.filter(l => l !== loc)
    } else {
      if (selectedLocations.includes(loc)) {
        next = selectedLocations.filter(l => l !== loc)
      } else {
        next = [...selectedLocations, loc]
      }
    }

    const containsAllIndividual = allLocs.every(l => next.includes(l))
    if (containsAllIndividual && allLocs.length > 0) {
      setSelectedLocations(['all'])
    } else {
      setSelectedLocations(next)
    }
  }

  const handleRemoveLocation = (loc: string) => {
    if (loc === 'all') {
      setSelectedLocations([])
    } else {
      setSelectedLocations(prev => prev.filter(l => l !== loc))
    }
  }

  const handleResetFilters = () => {
    setCategory(user?.category || 'GM')
    setYear('2025')
    setRound('R1')
    setSelectedClusters(['all'])
    setSelectedLocations(['all'])
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
  }

  const renderClusterDropdown = (isMobile: boolean = false) => {
    const minHeightClass = isMobile ? 'min-h-[48px]' : 'min-h-[40px]'
    const ref = isMobile ? mobileClusterDropdownRef : clusterDropdownRef
    return (
      <div ref={ref} data-tour="filter-cluster" className="relative w-full md:w-64">
        <div
          onClick={() => setIsClusterDropdownOpen(!isClusterDropdownOpen)}
          className={`flex items-center justify-between px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm ${minHeightClass}`}
        >
          <div className="flex flex-wrap gap-1.5 items-center mr-2">
            {selectedClusters.length === 0 ? (
              <span className="text-slate-400 dark:text-slate-400 text-sm">Select Clusters</span>
            ) : selectedClusters.includes('all') ? (
              <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-sky-950 text-blue-800 dark:text-sky-300 px-2 py-0.5 rounded-full text-xs font-semibold">
                All Clusters
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveCluster('all')
                  }}
                  className="hover:text-red-500 font-bold ml-1 focus:outline-none"
                >
                  ✕
                </button>
              </span>
            ) : (
              selectedClusters.map((code) => {
                const cl = clusters.find((c) => (c.cluster_code || (c as any)._id) === code)
                return (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 bg-blue-100 dark:bg-sky-950 text-blue-800 dark:text-sky-300 px-2 py-0.5 rounded-full text-xs font-semibold"
                  >
                    {cl ? cl.cluster_name.replace(/\s+cluster$/i, '') : code}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveCluster(code)
                      }}
                      className="hover:text-red-500 font-bold ml-1 focus:outline-none"
                    >
                      ✕
                    </button>
                  </span>
                )
              })
            )}
          </div>
          <span className="text-slate-400 dark:text-slate-500 text-xs ml-auto">
            {isClusterDropdownOpen ? '▲' : '▼'}
          </span>
        </div>

        {isClusterDropdownOpen && (
          <div className="cluster-dropdown-menu py-1">
            {/* Option: All Clusters */}
            <label className="flex items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedClusters.includes('all')}
                onChange={() => handleToggleCluster('all')}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 bg-white dark:bg-slate-700 dark:border-slate-600 cursor-pointer mr-2.5"
              />
              <span className="text-xs sm:text-sm text-slate-800 dark:text-gray-200 font-semibold">
                All Clusters
              </span>
            </label>

            {/* Option items */}
            {clusters.map((c) => {
              const code = c.cluster_code || (c as any)._id
              const isChecked = selectedClusters.includes(code) || selectedClusters.includes('all')
              return (
                <label
                  key={code}
                  className="flex items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleCluster(code)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 bg-white dark:bg-slate-700 dark:border-slate-600 cursor-pointer mr-2.5"
                  />
                  <span className="text-xs sm:text-sm text-slate-700 dark:text-gray-300 font-medium">
                    {c.cluster_name}
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const renderLocationDropdown = (isMobile: boolean = false) => {
    const minHeightClass = isMobile ? 'min-h-[48px]' : 'min-h-[40px]'
    const filteredLocs = locations.filter(loc =>
      loc.toLowerCase().includes(locationSearch.toLowerCase())
    )
    const ref = isMobile ? mobileLocationDropdownRef : locationDropdownRef

    return (
      <div ref={ref} data-tour="filter-location" className="relative w-full md:w-64">
        <div
          onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
          className={`flex items-center justify-between px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm ${minHeightClass}`}
        >
          <div className="flex flex-wrap gap-1.5 items-center mr-2">
            {selectedLocations.length === 0 ? (
              <span className="text-slate-400 dark:text-slate-400 text-sm">Select Locations</span>
            ) : selectedLocations.includes('all') ? (
              <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-sky-950 text-blue-800 dark:text-sky-300 px-2 py-0.5 rounded-full text-xs font-semibold">
                All Locations
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveLocation('all')
                  }}
                  className="hover:text-red-500 font-bold ml-1 focus:outline-none"
                >
                  ✕
                </button>
              </span>
            ) : (
              selectedLocations.map((loc) => (
                <span
                  key={loc}
                  className="inline-flex items-center gap-1 bg-blue-100 dark:bg-sky-950 text-blue-800 dark:text-sky-300 px-2 py-0.5 rounded-full text-xs font-semibold"
                >
                  {loc}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveLocation(loc)
                    }}
                    className="hover:text-red-500 font-bold ml-1 focus:outline-none"
                  >
                    ✕
                  </button>
                </span>
              ))
            )}
          </div>
          <span className="text-slate-400 dark:text-slate-500 text-xs ml-auto">
            {isLocationDropdownOpen ? '▲' : '▼'}
          </span>
        </div>

        {isLocationDropdownOpen && (
          <div className="cluster-dropdown-menu py-1">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
              <input
                type="text"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Search locations..."
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {locationSearch === '' && (
              <label className="flex items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedLocations.includes('all')}
                  onChange={() => handleToggleLocation('all')}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 bg-white dark:bg-slate-700 dark:border-slate-600 cursor-pointer mr-2.5"
                />
                <span className="text-xs sm:text-sm text-slate-800 dark:text-gray-200 font-semibold">
                  All Locations
                </span>
              </label>
            )}

            {filteredLocs.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">
                No locations found
              </div>
            ) : (
              filteredLocs.map((loc) => {
                const isChecked = selectedLocations.includes(loc) || selectedLocations.includes('all')
                return (
                  <label
                    key={loc}
                    className="flex items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleLocation(loc)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 bg-white dark:bg-slate-700 dark:border-slate-600 cursor-pointer mr-2.5"
                    />
                    <span className="text-xs sm:text-sm text-slate-700 dark:text-gray-300 font-medium">
                      {loc}
                    </span>
                  </label>
                )
              })
            )}
          </div>
        )}
      </div>
    )
  }

  /* ---------------- Initial Load Trigger ---------------- */
  useEffect(() => {
    if (user?.kcet_rank && openingRank !== '' && closingRank !== '' && Number(openingRank) > 0 && Number(closingRank) > 0 && !hasInitialLoaded) {
      loadRecommendations()
      setHasInitialLoaded(true)
    }
  }, [user, openingRank, closingRank, hasInitialLoaded])

  /* ---------------- Add Choice ---------------- */
  const addToChoices = async (id: string) => {
    try {
      await counsellingService.choices.create(id)
      const userId = getUserId()
      if (userId) {
        cache.remove(`choice_list_${userId}`)
      }
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

  /* ---------------- Toggle Checkboxes ---------------- */
  const toggleSelectRow = (publicId: string) => {
    setSelectedPublicIds(prev => {
      const next = new Set(prev)
      if (next.has(publicId)) {
        next.delete(publicId)
      } else {
        next.add(publicId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    const unadded = recommendations.filter(r => !isInChoices(r.public_id))
    const allSelected = unadded.length > 0 && unadded.every(r => selectedPublicIds.has(r.public_id))

    setSelectedPublicIds(prev => {
      const next = new Set(prev)
      if (allSelected) {
        unadded.forEach(r => next.delete(r.public_id))
      } else {
        unadded.forEach(r => next.add(r.public_id))
      }
      return next
    })
  }

  /* ---------------- Trigger Bulk Add Confirmation ---------------- */
  const handleBulkAdd = (isSelectedOnly: boolean) => {
    if (isSelectedOnly) {
      const selectedRecs = recommendations.filter(r => selectedPublicIds.has(r.public_id))
      if (selectedRecs.length === 0) return
      
      setConfirmModalData({
        isOpen: true,
        isSelectedOnly: true,
        totalVisible: selectedRecs.length,
        alreadyAdded: 0,
        willAdd: selectedRecs.length,
      })
    } else {
      const totalVisible = recommendations.length
      const alreadyAdded = recommendations.filter(r => isInChoices(r.public_id)).length
      const willAdd = recommendations.filter(r => !isInChoices(r.public_id)).length

      if (willAdd === 0) {
        alert("All visible recommendations are already in your choices.")
        return
      }

      setConfirmModalData({
        isOpen: true,
        isSelectedOnly: false,
        totalVisible,
        alreadyAdded,
        willAdd,
      })
    }
  }

  /* ---------------- Execute Bulk Add ---------------- */
  const executeBulkAdd = async () => {
    if (!confirmModalData) return
    setBulkAdding(true)
    try {
      // Collect target recommendations
      const targetRecs = recommendations.filter(r => {
        if (confirmModalData.isSelectedOnly) {
          return selectedPublicIds.has(r.public_id)
        }
        return !isInChoices(r.public_id)
      })

      // Construct choices format expected by the API
      const choicesToAdd = targetRecs.map(r => ({
        collegeCode: r.college.college_code,
        branchCode: r.branch.branch_id,
        year: parseInt(year, 10),
        round: round,
        category: category || 'GM',
      }))

      const res = await counsellingService.choices.bulkAdd(choicesToAdd)

      // Close confirmation modal
      setConfirmModalData(null)
      
      // Clear selected list
      setSelectedPublicIds(new Set())

      // Show success / fail notification
      if (res.failed > 0) {
        setResultModalData({
          added: res.added,
          skipped: res.skipped,
          failed: res.failed,
        })
      } else {
        showToast(`✓ Successfully added ${res.added} colleges. Skipped: ${res.skipped} already present`, 'success')
      }

      // Reload choices to update UI instantly
      const userId = getUserId()
      if (userId) {
        cache.remove(`choice_list_${userId}`)
      }
      await loadChoices()

    } catch (err: any) {
      alert(err.response?.data?.error || 'Error during bulk choices addition')
    } finally {
      setBulkAdding(false)
    }
  }

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type })
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (category) count++
    if (year) count++
    if (round) count++
    if (selectedClusters.length > 0 && !selectedClusters.includes('all')) count++
    if (selectedLocations.length > 0 && !selectedLocations.includes('all')) count++
    if (openingRank !== '' && Number(openingRank) > 0) count++
    if (closingRank !== '' && Number(closingRank) > 0) count++
    return count
  }, [category, year, round, selectedClusters, selectedLocations, openingRank, closingRank])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      {/* ---------------- Desktop Header ---------------- */}
      <div className="hidden md:flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-gray-100">
            College Recommendation
          </h1>
          <p className="text-slate-600 dark:text-gray-400">
            Welcome, <strong>{displayName}</strong>
          </p>
          <p className="text-slate-600 dark:text-gray-400">
            KCET Rank:{' '}
            <strong data-tour="kcet-rank">{user?.kcet_rank ?? 'Not set'}</strong>
          </p>
        </div>
        <button
          onClick={startTour}
          className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors flex items-center gap-2"
        >
          <span>🎯</span> Take Tour
        </button>
      </div>

      {/* ---------------- Mobile Header ---------------- */}
      <div className="md:hidden mb-5 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-gray-100 tracking-tight">
            College Recommendation
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            Welcome, <strong className="text-slate-700 dark:text-gray-300">{displayName}</strong>
          </p>
          <div data-tour="kcet-rank" className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-sky-950 text-blue-800 dark:text-sky-300">
            KCET Rank: {user?.kcet_rank ?? 'Not set'}
          </div>
        </div>
        <button
          onClick={startTour}
          className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 p-2 rounded-lg text-sm font-semibold hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors"
          title="Take Tour"
        >
          🎯
        </button>
      </div>

      {/* ---------------- Desktop Layout Container ---------------- */}
      <div className="hidden md:block bg-white dark:bg-slate-900/70 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
        
        {/* -------- Filters & Actions -------- */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-end justify-between mb-6 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-3">
          <div className="flex flex-wrap gap-4 items-end pb-2 lg:pb-0">
            <Filter label="Category">
              <select data-tour="filter-category" value={category} onChange={e => setCategory(e.target.value)} className=" pr-8 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200">
                <option value="">All</option>
                {categories.map(c => (
                  <option key={c.category}>{c.category}</option>
                ))}
              </select>
            </Filter>

            <Filter label="Year">
              <select data-tour="filter-year" value={year} onChange={e => setYear(e.target.value)} className=" pr-8 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200">
                {['2025', '2024', '2023', '2022'].map(y => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </Filter>

            <Filter label="Round">
              <select data-tour="filter-round" value={round} onChange={e => setRound(e.target.value)} className=" pr-8 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200">
                <option value="R1">Round 1</option>
                <option value="R2">Round 2</option>
                <option value="R3">Round 3</option>
              </select>
            </Filter>

            <Filter label="Cluster">
              {renderClusterDropdown(false)}
            </Filter>

            <Filter label="Location">
              {renderLocationDropdown(false)}
            </Filter>
                
            <Filter label="Opening Rank">
              <input
                data-tour="filter-opening-rank"
                type="number"
                value={openingRank}
                onChange={e => {
                  let val = e.target.value.replace(/^0+/, '');
                  if (val === '') {
                    setOpeningRank('');
                  } else {
                    let num = parseInt(val, 10);
                    if (num > 200000) {
                      num = 200000;
                      showToast('Opening rank cannot exceed 2,00,000', 'error');
                    }
                    setOpeningRank(num);
                  }
                }}
                className="pr-2 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200"
              />
            </Filter>

            <Filter label="Closing Rank">
              <input
                data-tour="filter-closing-rank"
                type="number"
                value={closingRank}
                onChange={e => {
                  let val = e.target.value.replace(/^0+/, '');
                  if (val === '') {
                    setClosingRank('');
                  } else {
                    let num = parseInt(val, 10);
                    if (num > 300000) {
                      num = 300000;
                      showToast('Closing rank cannot exceed 3,00,000', 'error');
                    }
                    setClosingRank(num);
                  }
                }}
                className="pr-2 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200"
              />
            </Filter>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mt-3 lg:mt-0">
            <button
              data-tour="refresh-results"
              onClick={() => loadRecommendations(true)}
              disabled={loading || bulkAdding}
              className="bg-blue-600 dark:bg-sky-400 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 dark:hover:bg-sky-500 transition disabled:opacity-50 min-h-[40px] sm:min-h-0 flex items-center justify-center font-medium"
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>

            {recommendations.length > 0 && (
              <>
                <button
                  data-tour="add-selected"
                  onClick={() => handleBulkAdd(true)}
                  disabled={loading || bulkAdding || selectedPublicIds.size === 0}
                  className="bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white px-4 py-2 rounded-md text-sm transition disabled:opacity-40 min-h-[40px] sm:min-h-0 flex items-center justify-center gap-1.5 font-semibold"
                >
                  <span>✓</span> Add Selected ({selectedPublicIds.size})
                </button>

                <button
                  data-tour="add-all"
                  onClick={() => handleBulkAdd(false)}
                  disabled={loading || bulkAdding || recommendations.filter(r => !isInChoices(r.public_id)).length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white px-4 py-2 rounded-md text-sm transition disabled:opacity-40 min-h-[40px] sm:min-h-0 flex items-center justify-center gap-1.5 font-semibold"
                >
                  <span>➕</span> Add All to Choices
                </button>
              </>
            )}
          </div>
        </div>

        {/* -------- Table -------- */}
        {recommendations.length === 0 ? (
          <p className="text-slate-500 dark:text-gray-400">
            {loading ? 'Loading recommendations…' : 'No recommendations found'}
          </p>
        ) : (
          <div data-tour="results-list" className="overflow-x-auto max-h-[50em]">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={
                        recommendations.filter(r => !isInChoices(r.public_id)).length > 0 &&
                        recommendations.filter(r => !isInChoices(r.public_id)).every(r => selectedPublicIds.has(r.public_id))
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 bg-white dark:bg-slate-700 dark:border-slate-600 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-slate-600 dark:text-gray-400">College Code</th>
                  <th className="px-6 py-3 text-left text-slate-600 dark:text-gray-400">College</th>
                  <th className="px-6 py-3 text-left text-slate-600 dark:text-gray-400">Branch</th>
                  <th className="px-6 py-3 text-left text-slate-600 dark:text-gray-400">{round} Cutoff</th>
                  <th className="px-6 py-3 text-left text-slate-600 dark:text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                {recommendations.map((r, i) => (
                  <tr
                    key={r.public_id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                  >
                    <td className="px-6 py-3">
                      {!isInChoices(r.public_id) ? (
                        <input
                          {...(i === 0 ? { 'data-tour': 'result-checkbox' } : {})}
                          type="checkbox"
                          checked={selectedPublicIds.has(r.public_id)}
                          onChange={() => toggleSelectRow(r.public_id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 bg-white dark:bg-slate-700 dark:border-slate-600 cursor-pointer"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked
                          disabled
                          className="rounded border-slate-200 text-green-600 h-4 w-4 bg-slate-100 dark:bg-slate-800 dark:border-slate-700 opacity-60 cursor-not-allowed"
                        />
                      )}
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-900 dark:text-gray-100">
                      {r.college.college_code || 'N/A'}
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        {...(i === 0 ? { 'data-tour': 'result-college-link' } : {})}
                        to={`/colleges/${r.college.public_id}`}
                        className="text-blue-600 dark:text-sky-400 hover:text-blue-800 dark:hover:text-sky-300 hover:underline cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.college.college_name}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        {...(i === 0 ? { 'data-tour': 'result-branch-link' } : {})}
                        to={`/branches/${r.public_id}`}
                        className="text-blue-600 dark:text-sky-400 hover:text-blue-800 dark:hover:text-sky-300 hover:underline cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.branch.branch_name}
                      </Link>
                    </td>
                    <td className="px-6 py-3" {...(i === 0 ? { 'data-tour': 'result-cutoff' } : {})}>{r.cutoff}</td>
                    <td className="px-6 py-3">
                      {isInChoices(r.public_id) ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                          Added
                        </span>
                      ) : (
                        <button
                          {...(i === 0 ? { 'data-tour': 'add-single-choice' } : {})}
                          onClick={() => addToChoices(r.public_id)}
                          className="text-blue-600 dark:text-sky-400 hover:text-blue-800 dark:hover:text-sky-300 hover:underline"
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

      {/* ---------------- Mobile Layout Container ---------------- */}
      <div className="md:hidden space-y-4">
        
        {/* -------- Filter Section (Collapsible Card) -------- */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-all duration-300">
          <button
            onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
            className="w-full px-4 py-3.5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 text-xs transition-transform duration-300">
                {isFiltersCollapsed ? '🔽' : '🔼'}
              </span>
              <span className="font-bold text-slate-800 dark:text-gray-100 text-sm">
                Filters ({activeFilterCount} Applied)
              </span>
            </div>
          </button>

          <div
            className={`transition-all duration-300 overflow-hidden ${
              isFiltersCollapsed ? 'max-h-0' : 'max-h-[800px] border-t border-slate-100 dark:border-slate-800 p-4 space-y-4'
            }`}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-gray-400">Category</label>
                <select
                  data-tour="filter-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200 text-sm"
                >
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c.category}>{c.category}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-gray-400">Year</label>
                <select
                  data-tour="filter-year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200 text-sm"
                >
                  {['2025', '2024', '2023', '2022'].map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-gray-400">Round</label>
                <select
                  data-tour="filter-round"
                  value={round}
                  onChange={(e) => setRound(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200 text-sm"
                >
                  <option value="R1">Round 1</option>
                  <option value="R2">Round 2</option>
                  <option value="R3">Round 3</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-gray-400">Cluster</label>
                {renderClusterDropdown(true)}
              </div>

              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-gray-400">Location</label>
                {renderLocationDropdown(true)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-gray-400">Opening Rank</label>
                <input
                  data-tour="filter-opening-rank"
                  type="number"
                  value={openingRank}
                  onChange={e => {
                    let val = e.target.value.replace(/^0+/, '');
                    if (val === '') {
                      setOpeningRank('');
                    } else {
                      let num = parseInt(val, 10);
                      if (num > 200000) {
                        num = 200000;
                        showToast('Opening rank cannot exceed 2,00,000', 'error');
                      }
                      setOpeningRank(num);
                    }
                  }}
                  className="w-full min-h-[48px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-gray-400">Closing Rank</label>
                <input
                  data-tour="filter-closing-rank"
                  type="number"
                  value={closingRank}
                  onChange={e => {
                    let val = e.target.value.replace(/^0+/, '');
                    if (val === '') {
                      setClosingRank('');
                    } else {
                      let num = parseInt(val, 10);
                      if (num > 300000) {
                        num = 300000;
                        showToast('Closing rank cannot exceed 3,00,000', 'error');
                      }
                      setClosingRank(num);
                    }
                  }}
                  className="w-full min-h-[48px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleResetFilters}
                className="w-full min-h-[48px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-gray-250 rounded-lg text-sm font-semibold transition"
              >
                Reset
              </button>
              <button
                data-tour="refresh-results"
                onClick={() => {
                  loadRecommendations()
                  setIsFiltersCollapsed(true)
                }}
                className="w-full min-h-[48px] bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white rounded-lg text-sm font-semibold transition"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* -------- Action Buttons Section -------- */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => loadRecommendations(true)}
              disabled={loading || bulkAdding}
              className="w-full min-h-[48px] bg-slate-600 hover:bg-slate-700 dark:bg-slate-805 dark:hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>

            <button
              data-tour="add-selected"
              onClick={() => handleBulkAdd(true)}
              disabled={loading || bulkAdding || selectedPublicIds.size === 0}
              className="w-full min-h-[48px] bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white rounded-lg text-sm font-bold transition disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <span>✓</span> Add Selected ({selectedPublicIds.size})
            </button>
          </div>

          <button
            data-tour="add-all"
            onClick={() => handleBulkAdd(false)}
            disabled={
              loading || bulkAdding || recommendations.filter((r) => !isInChoices(r.public_id)).length === 0
            }
            className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <span>➕</span> Add All to Choices
          </button>
        </div>

        {/* -------- Recommendation Results Summary -------- */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4">
          <div className="text-sm font-bold text-slate-800 dark:text-gray-100">
            Showing {recommendations.length} colleges
          </div>
          <div className="text-xs text-slate-505 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-1.5 font-medium">
            <span>{category || 'GM'}</span>
            <span>•</span>
            <span>{year}</span>
            <span>•</span>
            <span>Round {round.replace('R', '')}</span>
            <span>•</span>
            <span>Rank {openingRank} - {closingRank}</span>
          </div>
        </div>

        {/* -------- Recommendation Cards List -------- */}
        {recommendations.length === 0 ? (
          <p className="text-slate-500 dark:text-gray-400 text-sm text-center py-8">
            {loading ? 'Loading recommendations…' : 'No recommendations found'}
          </p>
        ) : (
          <div data-tour="results-list" className="space-y-4">
            {recommendations.map((r, i) => {
              const isAdded = isInChoices(r.public_id)
              const isExpanded = expandedCards.has(r.public_id)
              return (
                <div
                  key={r.public_id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden p-4 transition-all duration-300"
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">
                      {!isAdded ? (
                        <input
                          {...(i === 0 ? { 'data-tour': 'result-checkbox' } : {})}
                          type="checkbox"
                          checked={selectedPublicIds.has(r.public_id)}
                          onChange={() => toggleSelectRow(r.public_id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-5 w-5 bg-white dark:bg-slate-700 dark:border-slate-600 cursor-pointer"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked
                          disabled
                          className="rounded border-slate-200 text-green-600 h-5 w-5 bg-slate-100 dark:bg-slate-800 dark:border-slate-700 opacity-60 cursor-not-allowed"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-805 dark:text-gray-100 break-words leading-tight">
                        {r.college.college_name}
                      </h3>
                      <p
                        {...(i === 0 ? { 'data-tour': 'result-branch-link' } : {})}
                        className="text-xs text-slate-500 dark:text-gray-400 mt-1 break-words font-medium"
                      >
                        {r.branch.branch_name}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-center border-t border-slate-100 dark:border-slate-800/80 pt-2">
                    <button
                      onClick={() => toggleCardExpand(r.public_id)}
                      className="w-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-350 py-1.5 focus:outline-none"
                      aria-label="Toggle details"
                    >
                      <span className="text-sm transition-transform duration-300">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </button>
                  </div>

                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isExpanded ? 'max-h-60 mt-3 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs text-slate-600 dark:text-gray-300">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-400 dark:text-slate-505">College Code:</span>
                        <span className="font-bold text-slate-800 dark:text-gray-200">
                          {r.college.college_code || 'N/A'}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-400 dark:text-slate-505">{round} Cutoff:</span>
                        <span className="font-bold text-slate-800 dark:text-gray-200" {...(i === 0 ? { 'data-tour': 'result-cutoff' } : {})}>{r.cutoff}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-400 dark:text-slate-505">Status:</span>
                        {isAdded ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                            Added
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-805 text-slate-600 dark:text-gray-400">
                            Not Added
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 pt-3">
                        <Link
                          {...(i === 0 ? { 'data-tour': 'result-college-link' } : {})}
                          to={`/colleges/${r.college.public_id}`}
                          className="w-full min-h-[48px] bg-slate-105 dark:bg-slate-800 text-slate-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center font-semibold text-sm transition"
                        >
                          View College Details
                        </Link>

                        {!isAdded && (
                          <button
                            {...(i === 0 ? { 'data-tour': 'add-single-choice' } : {})}
                            onClick={() => addToChoices(r.public_id)}
                            className="w-full min-h-[48px] bg-blue-600 hover:bg-blue-750 dark:bg-sky-500 dark:hover:bg-sky-600 text-white rounded-lg flex items-center justify-center font-semibold text-sm transition"
                          >
                            Add to Choices
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ---------------- Scroll to Top Button (Mobile Only) ---------------- */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 md:hidden bg-blue-600 dark:bg-sky-500 text-white p-3.5 rounded-full shadow-lg hover:bg-blue-700 dark:hover:bg-sky-600 focus:outline-none active:scale-95 transition-all duration-200"
          aria-label="Scroll to top"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}

      {/* ---------------- Toast Notification ---------------- */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-pulse">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white font-medium ${
            toastMessage.type === 'success' ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-red-600 dark:bg-red-500'
          }`}>
            <span className="text-lg">✓</span>
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* ---------------- Confirmation Modal ---------------- */}
      {confirmModalData && confirmModalData.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span>📋</span> Add Recommendations
            </h3>
            
            <div className="space-y-3 mb-6 text-sm text-slate-600 dark:text-gray-300">
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-700/50 pb-2">
                <span>Visible Colleges:</span>
                <span className="font-semibold text-slate-800 dark:text-gray-100">{confirmModalData.totalVisible}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-700/50 pb-2">
                <span>Already Added:</span>
                <span className="font-semibold text-slate-800 dark:text-gray-100">{confirmModalData.alreadyAdded}</span>
              </div>
              <div className="flex justify-between pb-1 text-sky-600 dark:text-sky-400 font-medium">
                <span>New Additions:</span>
                <span className="font-bold text-slate-800 dark:text-gray-100">{confirmModalData.willAdd}</span>
              </div>
            </div>

            <p className="text-slate-600 dark:text-gray-300 text-sm mb-6">
              Do you want to add all {confirmModalData.willAdd} new colleges to your choice list?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModalData(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeBulkAdd}
                disabled={bulkAdding}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {bulkAdding ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Adding Colleges...
                  </>
                ) : (
                  `Add ${confirmModalData.willAdd} Colleges`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Detailed Results Modal ---------------- */}
      {resultModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span>📊</span> Choice Addition Results
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Added Successfully</span>
                <span className="text-lg font-bold text-emerald-800 dark:text-emerald-200">{resultModalData.added}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-600 dark:text-gray-300 font-semibold">Skipped (Already Present)</span>
                <span className="text-lg font-bold text-slate-700 dark:text-gray-200">{resultModalData.skipped}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                <span className="text-red-700 dark:text-red-300 font-semibold">Failed to Add</span>
                <span className="text-lg font-bold text-red-800 dark:text-red-200">{resultModalData.failed}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setResultModalData(null)}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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