export type UserRole = 'consultant' | 'manager' | 'admin' | 'employee'
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected'
export type VacationStatus = 'pending' | 'approved' | 'rejected'
export type VacationType = 'vacation' | 'sick_leave' | 'personal'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  created_at: string
}

export interface Timesheet {
  id: string
  user_id: string
  week_start: string
  status: TimesheetStatus
  total_hours: number
  notes: string | null
  submitted_at: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  review_notes: string | null
  created_at: string
  profiles?: Profile
}

export interface TimesheetEntry {
  id: string
  timesheet_id: string
  work_date: string
  hours: number
  description: string | null
}

export interface VacationRequest {
  id: string
  user_id: string
  start_date: string
  end_date: string
  type: VacationType
  status: VacationStatus
  reason: string | null
  submitted_at: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  review_notes: string | null
  created_at: string
  profiles?: Profile
}
