import { createClient } from '@/lib/supabase/server'
import TimesheetForm from './timesheet-form'
import type { TimesheetEntry } from '@/lib/types'

interface Props {
  searchParams: { week?: string }
}

export default async function NewTimesheetPage({ searchParams }: Props) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let existingEntries: TimesheetEntry[] = []
  let existingNotes = ''

  if (searchParams.week) {
    const { data: ts } = await supabase
      .from('timesheets')
      .select('id, notes')
      .eq('user_id', user!.id)
      .eq('week_start', searchParams.week)
      .single()

    if (ts) {
      const { data: entries } = await supabase
        .from('timesheet_entries')
        .select('*')
        .eq('timesheet_id', ts.id)
      existingEntries = entries ?? []
      existingNotes = ts.notes ?? ''
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {searchParams.week ? 'Edit Timesheet' : 'New Timesheet'}
      </h1>
      <TimesheetForm
        defaultWeek={searchParams.week}
        existingEntries={existingEntries}
        existingNotes={existingNotes}
      />
    </div>
  )
}
