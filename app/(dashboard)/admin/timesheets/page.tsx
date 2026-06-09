import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import ReviewTimesheetForm from './review-form'
import type { Timesheet } from '@/lib/types'

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default async function AdminTimesheetsPage() {
  // 1. Verify caller is admin or manager via the regular auth client
  const authClient = createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // 2. Fetch ALL timesheets using the service client (bypasses RLS)
  const supabase = createServiceClient()
  const { data: timesheets, error } = await supabase
    .from('timesheets')
    .select('*, profiles!timesheets_user_id_fkey(full_name)')
    .order('week_start', { ascending: false })

  if (error) {
    console.error('[AdminTimesheetsPage] fetch error:', error)
  }

  const submitted = timesheets?.filter((t: Timesheet) => t.status === 'submitted') ?? []
  const rest = timesheets?.filter((t: Timesheet) => t.status !== 'submitted') ?? []

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Review Timesheets</h1>

      {submitted.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">
            Pending Review ({submitted.length})
          </h2>
          <div className="space-y-4">
            {submitted.map((t: Timesheet) => (
              <div key={t.id} className="rounded-xl bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {(t.profiles as { full_name: string })?.full_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Week of {format(new Date(t.week_start + 'T00:00:00'), 'MMM d, yyyy')} ·{' '}
                      {t.total_hours}h
                    </p>
                    {t.notes && (
                      <p className="mt-1 text-sm text-gray-600 italic">&ldquo;{t.notes}&rdquo;</p>
                    )}
                  </div>
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                    submitted
                  </span>
                </div>
                <ReviewTimesheetForm id={t.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      {submitted.length === 0 && (
        <div className="rounded-xl bg-white p-6 shadow-sm text-sm text-gray-500">
          No timesheets pending review.
        </div>
      )}

      {rest.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">History</h2>
          <div className="rounded-xl bg-white shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Consultant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Week
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rest.map((t: Timesheet) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {(t.profiles as { full_name: string })?.full_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {format(new Date(t.week_start + 'T00:00:00'), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{t.total_hours}h</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColor[t.status]}`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
