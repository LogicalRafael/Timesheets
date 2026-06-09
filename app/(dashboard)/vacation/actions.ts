'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createVacationRequest(formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const startDate = formData.get('start_date') as string
  const endDate = formData.get('end_date') as string
  const type = formData.get('type') as string
  const reason = formData.get('reason') as string

  if (!startDate || !endDate || !type) {
    return { error: 'Please fill in all required fields.' }
  }

  if (endDate < startDate) {
    return { error: 'End date must be on or after start date.' }
  }

  const { error } = await supabase.from('vacation_requests').insert({
    user_id: user.id,
    start_date: startDate,
    end_date: endDate,
    type,
    reason: reason || null,
    status: 'pending',
    submitted_at: new Date().toISOString(),
  })

  if (error) return { error: error.message }

  revalidatePath('/vacation')
  redirect('/vacation')
}

export async function cancelVacationRequest(id: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('vacation_requests')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'pending')

  revalidatePath('/vacation')
}
