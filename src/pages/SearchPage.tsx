// SearchPage.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collegeService } from '../services/api'
import type { College } from '../types'

const SearchPage = () => {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('') // selected location
  const [locations, setLocations] = useState<string[]>([]) // dropdown options
  const [colleges, setColleges] = useState<College[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Updated fetch function accepts an optional location
  const fetchColleges = async (searchQuery = '', selectedLocation = '') => {
    setLoading(true)
    try {
      // collegeService.search should accept ({ query, location }) and return College[]
      const data = await collegeService.search({ query: searchQuery, location: selectedLocation })
      setColleges(data || [])
      setCurrentPage(1)
    } catch (err) {
      console.error('Error searching colleges:', err)
      setColleges([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // initial: fetch locations for dropdown and show all colleges
    const init = async () => {
      setLoading(true)
      try {
        // Prefer lightweight locations endpoint for speed
        const locationsList = await collegeService.getLocations() // returns string[]
        setLocations(locationsList || [])

        // fetch colleges (no filters) after locations loaded
        await fetchColleges('', '')
      } catch (err) {
        console.error('Initial load error', err)
        setLocations([])
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  // Helper to compile flexible regex matching on client-side
  const matchesQuery = (college: College, searchQuery: string) => {
    if (!searchQuery.trim()) return true
    const words = searchQuery.split(/\s+/).filter(Boolean)
    return words.every(word => {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const flexiblePattern = [...escapedWord].join('[.\\s-]*')
      const regex = new RegExp(flexiblePattern, 'i')
      return (
        regex.test(college.college_name) ||
        regex.test(college.college_code) ||
        regex.test(college.location)
      )
    })
  }

  const matchesLocation = (college: College, selectedLoc: string) => {
    if (!selectedLoc) return true
    return college.location.toLowerCase() === selectedLoc.toLowerCase()
  }

  const filteredColleges = colleges.filter(c => matchesQuery(c, query) && matchesLocation(c, location))

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentColleges = filteredColleges.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredColleges.length / itemsPerPage)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6 text-slate-800 dark:text-gray-100">Search Colleges</h1>

      <div className="mb-8">
        {/* responsive layout: vertical on small screens, horizontal on md+ */}
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by college name or code"
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-sky-400 bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-500"
          />

          {/* Location dropdown */}
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200"
          >
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredColleges.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-gray-100">Colleges ({filteredColleges.length})</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {currentColleges.map((college) => (
              <Link
                key={college.public_id}
                to={`/colleges/${college.public_id}`}
                className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md hover:shadow-lg transition border border-slate-300 dark:border-slate-700"
              >
                <h3 className="font-semibold text-lg text-slate-800 dark:text-gray-100">{college.college_name}</h3>
                <p className="text-slate-600 dark:text-gray-400 text-sm">Code: {college.college_code}</p>
                <p className="text-slate-600 dark:text-gray-400 text-sm">Location: {college.location}</p>
              </Link>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-800 dark:text-gray-200 bg-white dark:bg-slate-700 disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-600 transition"
              >
                Previous
              </button>
              
              <span className="text-slate-600 dark:text-gray-400 font-medium">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-800 dark:text-gray-200 bg-white dark:bg-slate-700 disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-600 transition"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && (query || location) && filteredColleges.length === 0 && (
        <div className="text-center py-12 text-slate-500 dark:text-gray-400">
          No colleges found for "{query}"{location ? ` in ${location}` : ''}
        </div>
      )}
    </div>
  )
}

export default SearchPage