import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import logo from '../assets/logo.png'

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setIsMobileMenuOpen(false)
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    if (path === '/dashboard/counselling' || path === '/dashboard/studying') {
      return location.pathname === '/dashboard/counselling' || location.pathname === '/dashboard/studying'
    }
    if (path === '/recommendations') {
      return location.pathname === '/recommendations'
    }
    return location.pathname === path
  }

  const getLinkClasses = (path: string) => {
    const active = isActive(path)
    return `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      active
        ? 'text-blue-600 dark:text-sky-400 font-semibold'
        : 'text-slate-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-sky-400'
    }`
  }

  const getMobileLinkClasses = (path: string) => {
    const active = isActive(path)
    return `block px-4 py-3 rounded-md text-base font-medium transition-colors ${
      active
        ? 'text-blue-600 dark:text-sky-400 font-semibold bg-blue-50 dark:bg-sky-900/20'
        : 'text-slate-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-700'
    }`
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white dark:bg-slate-800 shadow-md border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Logo + Title */}
            <div className="flex items-center flex-shrink-0">
              <Link 
                to="/" 
                className="flex items-center space-x-2"
                onClick={closeMobileMenu}
              >
                <img 
                  src={logo}
                  alt="KCET EduGuide Logo" 
                  className="h-8 sm:h-10 md:h-12 w-auto object-contain" 
                />
                <span 
                  className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 dark:text-sky-400"
                  style={{ fontFamily: 'Dancing Script, cursive' }}
                >
                  KCET EduGuide
                </span>
              </Link>
            </div>

            {/* Center: Desktop Navigation Links */}
            <div className="hidden lg:flex lg:items-center lg:justify-center lg:flex-1 lg:space-x-1 xl:space-x-2">
              <Link
                to="/"
                className={getLinkClasses('/')}
              >
                Home
              </Link>
              <Link
                to="/search"
                className={getLinkClasses('/search')}
              >
                Search College
              </Link>
              {isAuthenticated && (
                <Link
                  to={user?.type_of_student === 'counselling' ? '/dashboard/counselling' : '/dashboard/studying'}
                  className={getLinkClasses('/dashboard/counselling')}
                >
                  Dashboard
                </Link>
              )}
              {isAuthenticated && user?.type_of_student === 'counselling' && (
                <Link
                  to="/recommendations"
                  className={getLinkClasses('/recommendations')}
                >
                  Recommendation
                </Link>
              )}
              {isAuthenticated && (
                <Link
                  to="/meetings"
                  className={getLinkClasses('/meetings')}
                >
                  Meetings
                </Link>
              )}
              {isAuthenticated && (
                <Link
                  to="/profile"
                  className={getLinkClasses('/profile')}
                >
                  Profile
                </Link>
              )}
            </div>

            {/* Right: Desktop - Dark Mode + Username + Logout */}
            <div className="hidden lg:flex lg:items-center lg:space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              {isAuthenticated ? (
                <>
                  <span className="text-slate-700 dark:text-gray-300 text-sm font-medium">
                    {user?.name || user?.email_id || 'User'}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-sky-400 dark:hover:bg-sky-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Login / Register
                </Link>
              )}
            </div>

            {/* Mobile: Hamburger Menu Button */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <div
          className={`lg:hidden transition-all duration-300 ease-in-out overflow-hidden ${
            isMobileMenuOpen
              ? 'max-h-screen opacity-100'
              : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 pt-2 pb-4 space-y-1 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
            <Link
              to="/"
              className={getMobileLinkClasses('/')}
              onClick={closeMobileMenu}
            >
              Home
            </Link>
            <Link
              to="/search"
              className={getMobileLinkClasses('/search')}
              onClick={closeMobileMenu}
            >
              Search Colleges
            </Link>
            {isAuthenticated && user?.type_of_student === 'counselling' && (
              <Link
                to="/recommendations"
                className={getMobileLinkClasses('/recommendations')}
                onClick={closeMobileMenu}
              >
                Recommendations
              </Link>
            )}
            {isAuthenticated && (
              <Link
                to={user?.type_of_student === 'counselling' ? '/dashboard/counselling' : '/dashboard/studying'}
                className={getMobileLinkClasses('/dashboard/counselling')}
                onClick={closeMobileMenu}
              >
                Dashboard
              </Link>
            )}
            {isAuthenticated && (
              <Link
                to="/meetings"
                className={getMobileLinkClasses('/meetings')}
                onClick={closeMobileMenu}
              >
                Meetings
              </Link>
            )}
            {isAuthenticated && (
              <Link
                to="/profile"
                className={getMobileLinkClasses('/profile')}
                onClick={closeMobileMenu}
              >
                Profile
              </Link>
            )}
            
            {/* Mobile: Username + Dark Mode */}
            {isAuthenticated && (
              <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-slate-700 dark:text-gray-300 text-sm font-medium">
                    {user?.name || user?.email_id || 'User'}
                  </span>
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-md text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Toggle theme"
                  >
                    {theme === 'dark' ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Mobile: Logout Button (Full Width) */}
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-md text-base font-medium transition-colors"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/auth"
                className="block mt-2 text-center bg-blue-600 hover:bg-blue-700 dark:bg-sky-400 dark:hover:bg-sky-500 text-white px-4 py-3 rounded-md text-base font-medium transition-colors"
                onClick={closeMobileMenu}
              >
                Login / Register
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Backdrop overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 lg:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}
    </>
  )
}

export default Navbar
