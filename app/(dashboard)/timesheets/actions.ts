'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function saveTimesheet(formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const weekStart = formData.get('week_start') as string
  const notes = formData.get('notes') as string
  const action = formData.get('action') as string
  const status = action === 'submit' ? 'submitted' : 'draft'

  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  const entries = days.map((day) => ({
    work_date: formData.get(`date_${day}`) as string,
    hours: parseFloat((formData.get(`hours_${day}`) as string) || '0'),
    description: (formData.get(`desc_${day}`) as string) || null,
  }))

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0)

  const { data: existing } = await supabase
    .from('timesheets')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .single()

  let timesheetId: string

  if (existing) {
    if (existing.status === 'submitted' || existing.status === 'approved') {
      return { error: 'This timesheet has already been submitted and cannot be edited.' }
    }
    const { error } = await supabase
      .from('timesheets')
      .update({
        status,
        total_hours: totalHours,
        notes: notes || null,
        submitted_at: status === 'submitted' ? new Date().toISOString() : null,
      })
      .eq('id', existing.id)
    if (error) {
      console.error('[saveTimesheet] update error:', error)
      return { error: 'Failed to save timesheet. Please try again.' }
    }
    timesheetId = existing.id

    await supabase.from('timesheet_entries').delete().eq('timesheet_id', existing.id)
  } else {
    const { data, error } = await supabase
      .from('timesheets')
      .insert({
        user_id: user.id,
        week_start: weekStart,
        status,
        total_hours: totalHours,
        notes: notes || null,
        submitted_at: status === 'submitted' ? new Date().toISOString() : null,
      })
      .select('id')
      .single()
    if (error) {
      console.error('[saveTimesheet] insert error:', error)
      return { error: 'Failed to create timesheet. Please try again.' }
    }
    timesheetId = data.id
  }

  const validEntries = entries
    .filter((e) => e.hours > 0 || e.description)
    .map((e) => ({ ...e, timesheet_id: timesheetId }))

  if (validEntries.length > 0) {
    const { error } = await supabase.from('timesheet_entries').insert(validEntries)
    if (error) {
      console.error('[saveTimesheet] entries insert error:', error)
      return { error: 'Timesheet saved but failed to store day entries. Please try again.' }
    }
  }

  revalidatePath('/timesheets')
  redirect('/timesheets')
}

export async function deleteTimesheet(id: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('timesheets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'draft')

  revalidatePath('/timesheets')
}
