import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

const RegisterRoleSelection = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#111827] px-4 py-12">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Choose Your Registration Type
          </h1>
          <p className="text-lg text-slate-600 dark:text-gray-300">
            Select the type of account you want to create
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Counselling Student Card */}
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 
                       border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400
                       transition-all duration-300 cursor-pointer transform hover:scale-105"
            onClick={() => navigate('/register/counselling')}
          >
            <div className="text-center">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">
                Counselling Student
              </h2>
              <p className="text-slate-600 dark:text-gray-300 mb-6">
                For students seeking college admission guidance based on KCET rank
              </p>
              <ul className="text-left text-sm text-slate-600 dark:text-gray-400 space-y-2 mb-6">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Quick registration process</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>No verification required</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Get personalized recommendations</span>
                </li>
              </ul>
              <button
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                           text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Register as Counselling Student
              </button>
            </div>
          </div>

          {/* Studying Student Card */}
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 
                       border-2 border-transparent hover:border-green-500 dark:hover:border-green-400
                       transition-all duration-300 cursor-pointer transform hover:scale-105"
            onClick={() => navigate('/register/studying')}
          >
            <div className="text-center">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">
                Studying Student
              </h2>
              <p className="text-slate-600 dark:text-gray-300 mb-6">
                For students currently enrolled in a college
              </p>
              <ul className="text-left text-sm text-slate-600 dark:text-gray-400 space-y-2 mb-6">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>ID card verification required</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Connect with counselling students</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Share your college experience</span>
                </li>
              </ul>
              <button
                className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600
                           text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Register as Studying Student
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-slate-600 dark:text-gray-400">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/auth')}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterRoleSelection

