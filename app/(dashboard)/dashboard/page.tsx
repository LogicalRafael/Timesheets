import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import type { Timesheet, VacationRequest } from '@/lib/types'

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  pending: 'bg-amber-50 text-amber-700',
}

const statusDot: Record<string, string> = {
  draft: 'bg-gray-400',
  submitted: 'bg-blue-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
  pending: 'bg-amber-500',
}

/* win #7: stat card component */
function StatCard({
  label,
  value,
  sub,
  href,
}: {
  label: string
  value: string | number
  sub?: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-900/5 hover:shadow-md transition-shadow"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </Link>
  )
}

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

  const [{ data: timesheets }, { data: vacations }, { data: monthTimesheets }] = await Promise.all([
    supabase
      .from('timesheets')
      .select('*')
      .eq('user_id', user!.id)
      .order('week_start', { ascending: false })
      .limit(5),
    supabase
      .from('vacation_requests')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('timesheets')
      .select('total_hours')
      .eq('user_id', user!.id)
      .gte('week_start', monthStart)
      .lte('week_start', monthEnd)
      .in('status', ['submitted', 'approved']),
  ])

  const hoursThisMonth = (monthTimesheets ?? []).reduce(
    (sum, t: { total_hours: number }) => sum + (t.total_hours ?? 0),
    0
  )
  const pendingTimesheets = (timesheets ?? []).filter(
    (t: Timesheet) => t.status === 'submitted'
  ).length
  const pendingVacations = (vacations ?? []).filter(
    (v: VacationRequest) => v.status === 'pending'
  ).length

  return (
    <div className="space-y-8">
      {/* win #8: greeting + month label */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.full_name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{format(now, 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="Hours this month"
          value={hoursThisMonth}
          sub={format(now, 'MMMM yyyy')}
          href="/timesheets"
        />
        <StatCard
          label="Awaiting review"
          value={pendingTimesheets}
          sub="timesheets"
          href="/timesheets"
        />
        <StatCard
          label="Vacation pending"
          value={pendingVacations}
          sub="requests"
          href="/vacation"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent timesheets */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Recent Timesheets</h2>
            <Link href="/timesheets/new" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
              + New
            </Link>
          </div>
          {timesheets && timesheets.length > 0 ? (
            <ul className="divide-y divide-gray-50">
              {timesheets.map((t: Timesheet) => (
                <li key={t.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Week of {format(new Date(t.week_start + 'T00:00:00'), 'MMM d')}
                    </p>
                    <p className="text-xs text-gray-400">{t.total_hours}h logged</p>
                  </div>
                  {/* win #9: dot badge */}
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor[t.status]}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusDot[t.status]}`} />
                    {t.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-400">No timesheets yet</p>
              <Link href="/timesheets/new" className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">
                Submit your first →
              </Link>
            </div>
          )}
          <div className="border-t border-gray-50 px-5 py-3">
            <Link href="/timesheets" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
              View all timesheets →
            </Link>
          </div>
        </div>

        {/* Recent vacation requests */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Vacation Requests</h2>
            <Link href="/vacation/new" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
              + New
            </Link>
          </div>
          {vacations && vacations.length > 0 ? (
            <ul className="divide-y divide-gray-50">
              {vacations.map((v: VacationRequest) => (
                <li key={v.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {v.type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(v.start_date + 'T00:00:00'), 'MMM d')} –{' '}
                      {format(new Date(v.end_date + 'T00:00:00'), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor[v.status]}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusDot[v.status]}`} />
                    {v.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-400">No requests yet</p>
              <Link href="/vacation/new" className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">
                Submit a request →
              </Link>
            </div>
          )}
          <div className="border-t border-gray-50 px-5 py-3">
            <Link href="/vacation" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
              View all requests →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
