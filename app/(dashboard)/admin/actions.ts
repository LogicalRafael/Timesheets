'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/** Returns the verified user or redirects. Role must be 'admin'. */
async function assertAdmin() {
  const auth = createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await auth
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')
  return user
}

/** Returns the verified user or redirects. Role must be 'admin' or 'manager'. */
async function assertAdminOrManager() {
  const auth = createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await auth
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    redirect('/dashboard')
  }
  return user
}

export async function reviewTimesheet(formData: FormData) {
  // 1. Application-level auth check (does not rely on RLS)
  const user = await assertAdminOrManager()

  const id = formData.get('id') as string
  const decision = formData.get('decision') as 'approved' | 'rejected'
  const reviewNotes = (formData.get('review_notes') as string)?.trim() ?? ''

  if (!id) return { error: 'Missing timesheet ID.' }
  if (decision !== 'approved' && decision !== 'rejected') {
    return { error: 'Invalid decision.' }
  }
  if (decision === 'rejected' && !reviewNotes) {
    return { error: 'A rejection comment is required.' }
  }

  // 2. Use service client to bypass RLS — safe because role was already verified above
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('timesheets')
    .update({
      status: decision,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || null,
    })
    .eq('id', id)
    .eq('status', 'submitted')

  if (error) {
    console.error('[reviewTimesheet] error:', error)
    return { error: 'Failed to update timesheet. Please try again.' }
  }

  revalidatePath('/admin/timesheets')
}

export async function reviewVacation(formData: FormData) {
  const user = await assertAdmin()

  const id = formData.get('id') as string
  const decision = formData.get('decision') as 'approved' | 'rejected'
  const reviewNotes = (formData.get('review_notes') as string)?.trim() ?? ''

  if (!id) return { error: 'Missing request ID.' }
  if (decision !== 'approved' && decision !== 'rejected') {
    return { error: 'Invalid decision.' }
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('vacation_requests')
    .update({
      status: decision,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || null,
    })
    .eq('id', id)

  if (error) {
    console.error('[reviewVacation] error:', error)
    return { error: 'Failed to update vacation request. Please try again.' }
  }

  revalidatePath('/admin/vacation')
}
