import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { cancelVacationRequest } from './actions'
import type { VacationRequest } from '@/lib/types'

const statusColor: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
}

const statusDot: Record<string, string> = {
  pending: 'bg-amber-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
}

const typeLabel: Record<string, string> = {
  vacation: 'Vacation',
  sick_leave: 'Sick Leave',
  personal: 'Personal',
}

export default async function VacationPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: requests } = await supabase
    .from('vacation_requests')
    .select('*')
    .eq('user_id', user!.id)
    .order('start_date', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vacation</h1>
          <p className="mt-1 text-sm text-gray-500">Request and track your time off</p>
        </div>
        <Link
          href="/vacation/new"
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          + New
        </Link>
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
        {requests && requests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="hidden sm:table-cell px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Review Notes
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {requests.map((r: VacationRequest) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {typeLabel[r.type] ?? r.type}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {format(new Date(r.start_date + 'T00:00:00'), 'MMM d')} –{' '}
                      {format(new Date(r.end_date + 'T00:00:00'), 'MMM d, yyyy')}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor[r.status]}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusDot[r.status]}`} />
                        {r.status}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-5 py-4 text-sm text-gray-400 max-w-xs truncate">
                      {r.review_notes || '—'}
                    </td>
                    <td className="px-5 py-4 text-right text-sm whitespace-nowrap">
                      {r.status === 'pending' && (
                        <form
                          action={async () => {
                            'use server'
                            await cancelVacationRequest(r.id)
                          }}
                        >
                          <button type="submit" className="font-medium text-red-500 hover:text-red-400">
                            Cancel
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">No vacation requests yet</p>
            <p className="mt-1 text-sm text-gray-400">Request time off when you need it</p>
            <Link
              href="/vacation/new"
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              New Request
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
