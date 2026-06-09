import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import ReviewVacationForm from './review-form'
import type { VacationRequest } from '@/lib/types'

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const typeLabel: Record<string, string> = {
  vacation: 'Vacation',
  sick_leave: 'Sick Leave',
  personal: 'Personal',
}

export default async function AdminVacationPage() {
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

  if (profile?.role !== 'admin') redirect('/dashboard')

  const supabase = createServiceClient()
  const { data: requests, error } = await supabase
    .from('vacation_requests')
    .select('*, profiles!vacation_requests_user_id_fkey(full_name)')
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('[AdminVacationPage] fetch error:', error)
  }

  const pending = requests?.filter((r: VacationRequest) => r.status === 'pending') ?? []
  const rest = requests?.filter((r: VacationRequest) => r.status !== 'pending') ?? []

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Review Vacation Requests</h1>

      {pending.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">
            Pending Review ({pending.length})
          </h2>
          <div className="space-y-4">
            {pending.map((r: VacationRequest) => (
              <div key={r.id} className="rounded-xl bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {(r.profiles as { full_name: string })?.full_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {typeLabel[r.type] ?? r.type} ·{' '}
                      {format(new Date(r.start_date + 'T00:00:00'), 'MMM d, yyyy')} –{' '}
                      {format(new Date(r.end_date + 'T00:00:00'), 'MMM d, yyyy')}
                    </p>
                    {r.reason && (
                      <p className="mt-1 text-sm text-gray-600 italic">&ldquo;{r.reason}&rdquo;</p>
                    )}
                  </div>
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">
                    pending
                  </span>
                </div>
                <ReviewVacationForm id={r.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && (
        <div className="rounded-xl bg-white p-6 shadow-sm text-sm text-gray-500">
          No vacation requests pending review.
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
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rest.map((r: VacationRequest) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {(r.profiles as { full_name: string })?.full_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {typeLabel[r.type] ?? r.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {format(new Date(r.start_date + 'T00:00:00'), 'MMM d')} –{' '}
                      {format(new Date(r.end_date + 'T00:00:00'), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColor[r.status]}`}
                      >
                        {r.status}
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
