export interface Student {
  student_user_id: string
  type_of_student: 'counselling' | 'studying'
  name?: string
  category?: string
  email_id: string
  phone_number: string
  kcet_rank?: number
  college_code?: string
  unique_key?: string
  unique_key_data?: Branch
  year_of_starting?: number
  profile_completed: boolean
  approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejection_reason?: string
}

export interface AdminStudentListItem {
  student_user_id: string
  name: string
  email_id: string
  college_name: string
  department: string
  created_at: string
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED'
}

export interface AdminStudentDetail {
  student_user_id: string
  name: string
  email_id: string
  phone_number: string
  college_name: string
  department: string
  college_code: string
  year_of_starting: number
  usn: string
  category?: string
  created_at: string
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED'
  id_card_url?: string
  id_card_view_url?: string
  id_card_download_url?: string
  reviewed_by_email?: string
  reviewed_at?: string
  rejection_reason?: string
}

export interface Category {
  category: string
  fall_back: string
}

export interface Cluster {
  cluster_code: string
  cluster_name: string
}

export interface College {
  public_id: string
  college_code: string
  college_name: string
  location: string
}

export interface AdminCollege extends College {
  college_id: string
  college_link?: string | null
}

export interface AdminAccount {
  id: number
  email: string
  name: string
  is_active: boolean
  created_at: string
}

export interface Branch {
  unique_key: string
  public_id: string
  college: College
  cluster: {
    cluster_code: string
    cluster_name: string
  }
  branch_id: string
  branch_name: string
}

export interface Recommendation {
  unique_key: string
  public_id: string
  college: College
  branch: {
    branch_id: string
    branch_name: string
  }
  cluster: {
    cluster_code: string
    cluster_name: string
  }
  category: string
  cutoff: number  // Selected round cutoff (after fallback resolution)
  distance_from_rank: number
  eligibility_flag: boolean
}

export interface CounsellingChoice {
  choice_id: number
  order_of_list: number
  unique_key: string
  unique_key_data: Branch
  cutoff?: string | null
  created_at: string
}

export interface Review {
  review_id: number
  student_user_id: string
  student_user_id_data?: Student
  unique_key: string
  teaching_rating: number
  courses_rating: number
  library_rating: number
  research_rating: number
  internship_rating: number
  infrastructure_rating: number
  administration_rating: number
  extracurricular_rating: number
  safety_rating: number
  placement_rating: number
  preferred_day?: string
  preferred_time?: string
  teaching_review?: string
  courses_review?: string
  library_review?: string
  research_review?: string
  internship_review?: string
  infrastructure_review?: string
  administration_review?: string
  extracurricular_review?: string
  safety_review?: string
  placement_review?: string
}

export interface Meeting {
  meeting_id: number
  counselling_user_id: string
  studying_user_id: string
  counselling_user_id_data?: Student
  studying_user_id_data?: Student
  scheduled_time?: string
  duration_minutes: number
  meet_link?: string
  status: 'requested' | 'accepted' | 'rejected' | 'completed' | 'cancelled'
  created_at?: string
  updated_at?: string
}

export interface BranchInsightsResponse {
  about: string
  admission_cutoffs: string
  placements: string
  pros_cons: {
    pros: string[]
    cons: string[]
  }
  features: string[]
  one_line_summary: string
  additional_info: string[]
}

