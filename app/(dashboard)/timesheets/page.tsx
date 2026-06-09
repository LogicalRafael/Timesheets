import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { deleteTimesheet } from './actions'
import type { Timesheet } from '@/lib/types'

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
}

const statusDot: Record<string, string> = {
  draft: 'bg-gray-400',
  submitted: 'bg-blue-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
}

export default async function TimesheetsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: timesheets } = await supabase
    .from('timesheets')
    .select('*')
    .eq('user_id', user!.id)
    .order('week_start', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timesheets</h1>
          <p className="mt-1 text-sm text-gray-500">Track and submit your weekly hours</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/export/timesheets"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm4.75 11.25a.75.75 0 001.5 0v-3.69l1.22 1.22a.75.75 0 101.06-1.06l-2.5-2.5a.75.75 0 00-1.06 0l-2.5 2.5a.75.75 0 101.06 1.06l1.22-1.22v3.69z" clipRule="evenodd" />
            </svg>
            Export PDF
          </a>
          <Link
            href="/timesheets/new"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            + New
          </Link>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
        {timesheets && timesheets.length > 0 ? (
          /* win: overflow-x-auto so table scrolls on mobile instead of overflowing */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Week
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {/* hidden on mobile */}
                  <th className="hidden sm:table-cell px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Review Notes
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {timesheets.map((t: Timesheet) => (
                  <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {format(new Date(t.week_start + 'T00:00:00'), 'MMM d, yyyy')}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {t.total_hours}h
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor[t.status]}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusDot[t.status]}`} />
                        {t.status}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-5 py-4 text-sm text-gray-400 max-w-xs truncate">
                      {t.review_notes || '—'}
                    </td>
                    <td className="px-5 py-4 text-right text-sm whitespace-nowrap">
                      {(t.status === 'draft' || t.status === 'rejected') && (
                        <div className="flex items-center justify-end gap-4">
                          <Link
                            href={`/timesheets/new?week=${t.week_start}`}
                            className="font-medium text-indigo-600 hover:text-indigo-500"
                          >
                            Edit
                          </Link>
                          {t.status === 'draft' && (
                            <form
                              action={async () => {
                                'use server'
                                await deleteTimesheet(t.id)
                              }}
                            >
                              <button type="submit" className="font-medium text-red-500 hover:text-red-400">
                                Delete
                              </button>
                            </form>
                          )}
                        </div>
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">No timesheets yet</p>
            <p className="mt-1 text-sm text-gray-400">Submit your first timesheet to get started</p>
            <Link
              href="/timesheets/new"
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              New Timesheet
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
