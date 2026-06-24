import axios from 'axios'
import { cache } from '../utils/cache'
import { CACHE_DURATION } from '../constants/cacheDurations'
import { jwtDecode } from 'jwt-decode'
import type {
  Student,
  Recommendation,
  CounsellingChoice,
  Review,
  Meeting,
  College,
  Branch,
  Category,
  Cluster,
  BranchInsightsResponse,
  AdminAccount,
  AdminCollege,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const tokens = getTokens()
    if (tokens?.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`
    } else {
      console.warn('No access token found for request:', config.url)
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {}

    // If there's no response at all, just bubble up (true network/CORS error)
    if (!error.response) {
      return Promise.reject(error)
    }

    const status = error.response.status
    const url: string = originalRequest.url || ''

    // Do NOT attempt refresh for auth endpoints themselves
    const isAuthEndpoint =
      url.includes('/auth/login/') ||
      url.includes('/auth/register/') ||
      url.includes('/auth/refresh/') ||
      url.includes('/admin/login/')

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true

      try {
        const tokens = getTokens()
        if (tokens?.refresh) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: tokens.refresh,
          })
          const newTokens = {
            access: response.data.access,
            // Use new refresh token if provided, otherwise keep the old one
            refresh: response.data.refresh || tokens.refresh,
          }
          setTokens(newTokens)
          if (!originalRequest.headers) originalRequest.headers = {}
          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`
          return api(originalRequest)
        } else {
          console.warn('No refresh token available, redirecting to login')
          clearTokens()
          window.location.href = '/auth'
          return Promise.reject(new Error('No refresh token available'))
        }
      } catch (refreshError: any) {
        // Refresh failed, clear auth and send user to login
        console.error('Token refresh failed:', refreshError)
        clearTokens()
        // Only redirect if we're not already on the auth page
        if (!window.location.pathname.includes('/auth')) {
          window.location.href = '/auth'
        }
        // Attach a clearer message so UI doesn't just show "Network Error"
        if (!refreshError.response) {
          refreshError.message = refreshError.message || 'Session expired. Please log in again.'
        }
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

function getTokens() {
  const stored = localStorage.getItem('tokens')
  return stored ? JSON.parse(stored) : null
}

function setTokens(tokens: { access: string; refresh: string }) {
  localStorage.setItem('tokens', JSON.stringify(tokens))
}

function clearTokens() {
  localStorage.removeItem('tokens')
  localStorage.removeItem('user')
}

export function getUserId(): string | null {
  try {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) return null
    const parsed = JSON.parse(storedUser)
    return parsed.student_user_id || null
  } catch {
    return null
  }
}

export function getJwtExpiry(): number | null {
  try {
    const tokens = getTokens()
    if (!tokens?.access) return null
    const decoded = jwtDecode<{ exp?: number }>(tokens.access)
    return decoded.exp ? decoded.exp * 1000 : null
  } catch (err) {
    console.error('Error decoding JWT:', err)
    return null
  }
}

export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login/', { email_id: email, password })
    return response.data
  },

  register: async (data: any) => {
    const response = await api.post('/auth/register/', data)
    return response.data
  },

  registerCounselling: async (data: any) => {
    const response = await api.post('/auth/register/counselling/', data)
    return response.data
  },

  registerStudying: async (data: Record<string, unknown>) => {
    const response = await api.post('/student/register/', data)
    return response.data
  },

  sendOtp: async (email: string, purpose: 'registration' | 'forgot_password' | 'change_password') => {
    const response = await api.post('/auth/send-otp/', { email, purpose })
    return response.data
  },

  verifyOtp: async (email: string, otp: string, purpose: 'registration' | 'forgot_password' | 'change_password') => {
    const response = await api.post('/auth/verify-otp/', { email, otp, purpose })
    return response.data
  },

  resetPassword: async (email: string, password: string, passwordConfirm: string, token: string) => {
    const response = await api.post('/auth/reset-password/', { email, password, passwordConfirm, token })
    return response.data
  },

  changePassword: async (password: string, passwordConfirm: string, token: string) => {
    const response = await api.post('/auth/change-password/', { password, passwordConfirm, token })
    return response.data
  },

  me: async (): Promise<Student> => {
    const response = await api.get('/auth/me/')
    return response.data
  },

  updateProfile: async (data: Partial<Student>): Promise<Student> => {
    const response = await api.patch('/auth/profile/', data)
    return response.data
  },

  refresh: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh/', { refresh: refreshToken })
    return response.data
  },

  setTokens,
  clearTokens,
}

export const studentService = {
  uploadIdCard: async (file: File): Promise<{ id_card_url: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/student/upload-id-card/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}

export const adminStudentService = {
  list: async (status: string = 'all', search: string = '') => {
    const response = await adminApi.get('/admin/students/', {
      params: { status, search },
    })
    return response.data
  },

  detail: async (studentId: string) => {
    const response = await adminApi.get(`/admin/students/${studentId}/`)
    return response.data
  },

  approve: async (studentId: string) => {
    const response = await adminApi.post(`/admin/students/${studentId}/approve/`)
    return response.data
  },

  reject: async (studentId: string, reason: string) => {
    const response = await adminApi.post(`/admin/students/${studentId}/reject/`, { reason })
    return response.data
  },
}

// // services/api.ts  (replace existing collegeService block with this)
// import api from './apiInstance' // <-- if you export `api` as axios instance; else use your `api` variable here
// // or if api is in same file skip the import (keep the axios instance you already have)

export const collegeService = {
  list: async (): Promise<College[]> => {
    const cached = cache.get<College[]>('college_list')
    if (cached) return cached

    const response = await api.get('/colleges/')
    cache.set('college_list', response.data, CACHE_DURATION.WEEK)
    return response.data
  },

  detail: async (publicId: string): Promise<College & { branches: Branch[] }> => {
    const key = `college_${publicId}`
    const cached = cache.get<College & { branches: Branch[] }>(key)
    if (cached) return cached

    const response = await api.get(`/colleges/${publicId}/`)
    cache.set(key, response.data, CACHE_DURATION.WEEK)
    return response.data
  },

  cutoff: async (publicId: string) => {
    const key = `cutoff_${publicId}`
    const cached = cache.get<any>(key)
    if (cached) return cached

    const response = await api.get(`/colleges/${publicId}/cutoff/`)
    cache.set(key, response.data, CACHE_DURATION.WEEK)
    return response.data
  },

  /**
   * search(params)
   * - Accepts { query?, location? }
   * - Calls your Django /search/ endpoint which returns { colleges, branches, locations }
   * - Returns an array of colleges (frontend expects College[])
   */
  search: async (params: { query?: string; location?: string } = {}): Promise<College[]> => {
    const queryVal = (params.query || '').trim().toLowerCase()
    const locationVal = (params.location || '').trim().toLowerCase()
    const key = `search_${queryVal}_${locationVal}`

    const cached = cache.get<College[]>(key)
    if (cached) return cached

    const res = await api.get('/search/', { params })
    
    let result: College[] = []
    // backend returns { colleges, branches, locations } — prefer colleges
    if (res?.data?.colleges && Array.isArray(res.data.colleges)) {
      result = res.data.colleges as College[]
    } else if (Array.isArray(res.data)) {
      // fallback: if the endpoint returns an array directly
      result = res.data as College[]
    }

    cache.set(key, result, CACHE_DURATION.WEEK)
    return result
  },

  /**
   * getLocations()
   * - Calls /locations/ (lightweight) and handles either:
   *    { locations: [...] }  OR  plain array ["City1","City2"]
   */
  getLocations: async (): Promise<string[]> => {
    try {
      const res = await api.get('/locations/')
      if (res?.data?.locations && Array.isArray(res.data.locations)) return res.data.locations
      if (Array.isArray(res.data)) {
        if (res.data.length > 0 && typeof res.data[0] === 'object' && res.data[0] !== null) {
          return res.data.map((item: any) => item.location_name || item.location).filter(Boolean)
        }
        return res.data
      }
      // unexpected shape -> try search fallback
    } catch (err) {
      // fall through to fallback below
      console.warn('/locations/ failed, trying /search/ fallback', err)
    }

    // Fallback: call /search/ and read locations or derive from colleges
    try {
      const res2 = await api.get('/search/', { params: {} })
      if (res2?.data?.locations && Array.isArray(res2.data.locations)) return res2.data.locations
      if (Array.isArray(res2?.data?.colleges)) {
        const dedup = Array.from(new Set<string>(res2.data.colleges.map((c: any) => (c.location || '').trim()).filter(Boolean)))
        return dedup.sort()
      }
    } catch (err) {
      console.error('Fallback /search/ also failed when fetching locations', err)
    }

    return []
  }
}


export const branchService = {
  detail: async (publicId: string): Promise<Branch> => {
    const key = `branch_${publicId}`
    const cached = cache.get<Branch>(key)
    if (cached) return cached

    const response = await api.get(`/branches/${publicId}/`)
    cache.set(key, response.data, CACHE_DURATION.WEEK)
    return response.data
  },

  byCollegeCode: async (collegeCode: string): Promise<Branch[]> => {
    const key = `branch_list_${collegeCode}`
    const cached = cache.get<Branch[]>(key)
    if (cached) return cached

    const response = await api.get(`/branches/by-code/${collegeCode}/`)
    cache.set(key, response.data, CACHE_DURATION.WEEK)
    return response.data
  },

  cutoff: async (publicId: string, category?: string) => {
    const key = `cutoff_branch_${publicId}${category ? `_${category}` : ''}`
    const cached = cache.get<any>(key)
    if (cached) return cached

    const params = category ? { category } : {}
    const response = await api.get(`/branches/${publicId}/cutoff/`, { params })
    cache.set(key, response.data, CACHE_DURATION.WEEK)
    return response.data
  },

  insights: async (branchId: string): Promise<BranchInsightsResponse> => {
    const response = await api.get(`/branch-insights/${branchId}/`)
    return response.data as BranchInsightsResponse
  },
}

const adminApi = axios.create({
  baseURL: API_BASE_URL,
})

adminApi.interceptors.request.use((config) => {
  const tokens = adminAuthService.getTokens()
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`
  }
  return config
})

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url || ''
    if (error.response?.status === 401 && !url.includes('/admin/login/')) {
      adminAuthService.clearSession()
      if (!window.location.pathname.startsWith('/admin/login')) {
        window.location.href = '/admin/login'
      }
    }
    return Promise.reject(error)
  }
)

function getAdminTokens() {
  const stored = localStorage.getItem('admin_tokens')
  return stored ? JSON.parse(stored) : null
}

export const adminAuthService = {
  getTokens: getAdminTokens,

  setTokens: (tokens: { access: string }) => {
    localStorage.setItem('admin_tokens', JSON.stringify(tokens))
  },

  getStoredAdmin: (): AdminAccount | null => {
    const stored = localStorage.getItem('admin_user')
    return stored ? JSON.parse(stored) : null
  },

  setStoredAdmin: (admin: AdminAccount) => {
    localStorage.setItem('admin_user', JSON.stringify(admin))
  },

  clearSession: () => {
    localStorage.removeItem('admin_tokens')
    localStorage.removeItem('admin_user')
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/admin/login/', { email, password })
    return response.data as { admin: AdminAccount; tokens: { access: string } }
  },

  me: async (): Promise<AdminAccount> => {
    const response = await adminApi.get('/admin/me/')
    return response.data.admin
  },
}

export const adminInsightService = {
  listColleges: async (): Promise<AdminCollege[]> => {
    const response = await adminApi.get('/admin/colleges/')
    return response.data
  },

  listBranches: async (collegeId: string): Promise<Branch[]> => {
    const response = await adminApi.get(`/admin/colleges/${collegeId}/branches/`)
    return response.data
  },

  upload: async (
    payload: {
      college_id: string
      branch_id: string
      json_text?: string
      json_file?: File
    },
    onUploadProgress?: (event: { loaded: number; total?: number }) => void
  ) => {
    const formData = new FormData()
    formData.append('college_id', payload.college_id)
    formData.append('branch_id', payload.branch_id)
    if (payload.json_text) {
      formData.append('json_text', payload.json_text)
    }
    if (payload.json_file) {
      formData.append('json_file', payload.json_file)
    }

    const response = await adminApi.post('/admin/branch-insights/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    })
    return response.data as { message: string }
  },
}

export const counsellingService = {
  recommendations: async (
    kcetRank: number,
    category?: string,
    year?: string,
    round?: string,
    cluster?: string | string[],
    openingRank?: number,
    closingRank?: number
  ): Promise<{
    recommendations: Recommendation[]
    count: number
    opening_rank?: number
    closing_rank?: number
  }> => {
    const clustersStr = Array.isArray(cluster) ? cluster.join("-") : (cluster || "all")
    const recommendationKey = `recommendation_${kcetRank}_${category || "GM"}_${year || "2025"}_${round || "R1"}_${clustersStr}_${openingRank || 0}_${closingRank || 0}`
    
    const cached = cache.get<any>(recommendationKey)
    if (cached) return cached

    const response = await api.post('/counselling/recommendations/', {
      kcet_rank: kcetRank,
      category,
      year: year || '2025',
      round: round || 'R1',
      cluster,
      opening_rank: openingRank,
      closing_rank: closingRank,
    })
    cache.set(recommendationKey, response.data, CACHE_DURATION.DAY)
    return response.data
  },

  choices: {
    list: async (): Promise<CounsellingChoice[]> => {
      const userId = getUserId()
      const key = userId ? `choice_list_${userId}` : ''
      if (key) {
        const cached = cache.get<CounsellingChoice[]>(key)
        if (cached) return cached
      }

      const response = await api.get('/counselling/choices/')
      
      if (key) {
        const expiry = getJwtExpiry()
        const ttl = expiry ? expiry - Date.now() : null
        if (ttl === null || ttl > 0) {
          cache.set(key, response.data, ttl)
        }
      }
      return response.data
    },

    create: async (publicId: string, orderOfList?: number): Promise<CounsellingChoice> => {
      const payload: Record<string, any> = { public_id: publicId }
      if (orderOfList !== undefined) {
        payload.order_of_list = orderOfList
      }
      const response = await api.post('/counselling/choices/create/', payload)
      return response.data
    },

    update: async (choiceId: number, orderOfList: number): Promise<CounsellingChoice> => {
      const response = await api.patch(`/counselling/choices/${choiceId}/update/`, {
        order_of_list: orderOfList,
      })
      return response.data
    },

    bulkUpdate: async (choices: Array<{ choice_id: number; order_of_list: number }>): Promise<CounsellingChoice[]> => {
      const response = await api.post('/counselling/choices/bulk-update/', {
        choices: choices,
      })
      return response.data
    },

    bulkAdd: async (choices: Array<{ collegeCode: string; branchCode: string; year: number; round: string; category: string }>): Promise<{ success: boolean; added: number; skipped: number; failed: number }> => {
      const response = await api.post('/counselling/choices/bulk-add/', {
        choices,
      })
      return response.data
    },

    bulkDelete: async (choiceIds: Array<string | number>): Promise<{ success: boolean; deleted: number }> => {
      const response = await api.post('/counselling/choices/bulk-delete/', {
        choiceIds,
      })
      return response.data
    },

    delete: async (choiceId: number): Promise<void> => {
      await api.delete(`/counselling/choices/${choiceId}/delete/`)
    },
  },
}

export const reviewService = {
  create: async (data: Partial<Review>): Promise<Review> => {
    const response = await api.post('/reviews/', data)
    return response.data
  },

  myReview: async (uniqueKey: string): Promise<Review | null> => {
    try {
      const response = await api.get(`/reviews/my-review/${uniqueKey}/`)
      const data = response.data
      // Backend returns {'review': None} when no review exists, or the review object directly when it exists
      if (data === null) return null
      let rev: any = data
      if (typeof data === 'object' && 'review' in data) {
        rev = data.review
      }
      if (!rev) return null
      // Normalize backend _id to frontend `review_id` for consistent handling
      if (rev._id && !rev.review_id) rev.review_id = rev._id
      return rev as Review
    } catch (error: any) {
      // If 401 or other auth errors, return null instead of throwing
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('Authentication error loading review:', error)
        return null
      }
      throw error
    }
  },

  delete: async (uniqueKey: string): Promise<void> => {
    await api.delete(`/reviews/my-review/${uniqueKey}/delete/`)
  },

  branchReviews: async (publicId: string): Promise<{
    reviews: Review[]
    average_ratings: Record<string, number>
    total_reviews: number
  }> => {
    const response = await api.get(`/reviews/branches/${publicId}/`)
    return response.data
  },

  collegeReviews: async (publicId: string) => {
    const response = await api.get(`/reviews/colleges/${publicId}/`)
    return response.data
  },
}

export const meetingService = {
  create: async (data: any): Promise<Meeting> => {
    const response = await api.post('/meetings/request/', data)
    return response.data
  },

  getApproved: async (): Promise<Meeting[]> => {
    const response = await api.get('/meetings/approved/')
    return response.data
  },

  register: async (meetingId: string): Promise<any> => {
    const response = await api.post(`/meetings/${meetingId}/register/`)
    return response.data
  },

  getRegistered: async (): Promise<Meeting[]> => {
    const response = await api.get('/meetings/registered/')
    return response.data
  },

  getHostMeetings: async (): Promise<Meeting[]> => {
    const response = await api.get('/meetings/host/')
    return response.data
  },

  join: async (meetingId: string): Promise<{ meetingLink: string }> => {
    const response = await api.post(`/meetings/${meetingId}/join/`)
    return response.data
  },

  // Admin APIs
  adminGetPending: async (): Promise<Meeting[]> => {
    const response = await adminApi.get('/meetings/admin/pending/')
    return response.data
  },

  adminApprove: async (meetingId: string, data: { meetingCapacity: number; meetingLink: string }): Promise<Meeting> => {
    const response = await adminApi.post(`/meetings/admin/${meetingId}/approve/`, data)
    return response.data
  },

  adminReject: async (meetingId: string, data: { rejectionReason: string }): Promise<Meeting> => {
    const response = await adminApi.post(`/meetings/admin/${meetingId}/reject/`, data)
    return response.data
  },

  adminCreate: async (data: any): Promise<Meeting> => {
    const response = await adminApi.post('/meetings/admin/create/', data)
    return response.data
  },

  adminGetHistory: async (status: string): Promise<Meeting[]> => {
    const response = await adminApi.get('/meetings/admin/history/', { params: { status } })
    return response.data
  },
}

export const categoryService = {
  list: async (): Promise<Category[]> => {
    const key = 'categories'
    const cached = cache.get<Category[]>(key)
    if (cached) return cached

    try {
      const response = await api.get('/colleges/categories/')
      cache.set(key, response.data, CACHE_DURATION.MONTH)
      return response.data
    } catch (error) {
      // Fallback to hardcoded categories if API fails
      console.warn('Failed to load categories from API, using fallback list')
      const { HARDCODED_CATEGORIES } = await import('../data/categories')
      return HARDCODED_CATEGORIES
    }
  },
}

export const clusterService = {
  list: async (): Promise<Cluster[]> => {
    const key = 'cluster_list'
    const cached = cache.get<Cluster[]>(key)
    if (cached) return cached

    try {
      const response = await api.get('/colleges/clusters/')
      cache.set(key, response.data, CACHE_DURATION.MONTH)
      return response.data
    } catch (error) {
      console.warn('Failed to load clusters from API')
      return []
    }
  },
}

