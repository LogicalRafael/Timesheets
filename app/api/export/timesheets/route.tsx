import { renderToBuffer } from '@react-pdf/renderer'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import TimesheetsPDF from '@/components/timesheets-pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  // 1. Auth check
  const auth = createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await auth
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })

  const isAdminOrManager = ['admin', 'manager'].includes(profile.role)

  // 2. Fetch timesheets — service client for admin/manager, scoped for consultant
  let timesheets
  if (isAdminOrManager) {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('timesheets')
      .select('*, profiles!timesheets_user_id_fkey(full_name)')
      .order('week_start', { ascending: false })
    if (error) {
      console.error('[export/timesheets] admin fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch timesheets' }, { status: 500 })
    }
    timesheets = data ?? []
  } else {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('timesheets')
      .select('*, profiles!timesheets_user_id_fkey(full_name)')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
    if (error) {
      console.error('[export/timesheets] consultant fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch timesheets' }, { status: 500 })
    }
    timesheets = data ?? []
  }

  // 3. Render PDF — .tsx allows JSX so the type matches DocumentProps
  const exportedBy = profile.full_name || user.email || 'Unknown'
  const buffer = await renderToBuffer(
    <TimesheetsPDF timesheets={timesheets} exportedBy={exportedBy} />
  )

  const filename = `timesheets-${new Date().toISOString().split('T')[0]}.pdf`

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
