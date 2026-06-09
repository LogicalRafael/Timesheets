'use client'

import { useState, useTransition } from 'react'
import { addDays, format, startOfWeek } from 'date-fns'
import { saveTimesheet } from '../actions'
import type { TimesheetEntry } from '@/lib/types'

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function getMondayOfWeek(dateStr?: string): Date {
  const base = dateStr ? new Date(dateStr + 'T00:00:00') : new Date()
  return startOfWeek(base, { weekStartsOn: 1 })
}

interface DayEntry {
  work_date: string
  hours: string
  description: string
}

function buildDefaultEntries(monday: Date, existing: TimesheetEntry[]): DayEntry[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = format(addDays(monday, i), 'yyyy-MM-dd')
    const found = existing.find((e) => e.work_date === date)
    return {
      work_date: date,
      hours: found ? String(found.hours) : '',
      description: found?.description ?? '',
    }
  })
}

interface Props {
  defaultWeek?: string
  existingEntries: TimesheetEntry[]
  existingNotes: string
}

export default function TimesheetForm({ defaultWeek, existingEntries, existingNotes }: Props) {
  const [monday, setMonday] = useState(() => getMondayOfWeek(defaultWeek))
  const [entries, setEntries] = useState<DayEntry[]>(() =>
    buildDefaultEntries(getMondayOfWeek(defaultWeek), existingEntries)
  )
  const [notes, setNotes] = useState(existingNotes)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function changeWeek(direction: -1 | 1) {
    const newMonday = addDays(monday, direction * 7)
    setMonday(newMonday)
    setEntries(buildDefaultEntries(newMonday, []))
  }

  function updateEntry(index: number, field: keyof DayEntry, value: string) {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)))
  }

  const totalHours = entries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0)

  function buildFormData(action: 'draft' | 'submit') {
    const fd = new FormData()
    fd.set('week_start', format(monday, 'yyyy-MM-dd'))
    fd.set('notes', notes)
    fd.set('action', action)
    DAY_KEYS.forEach((day, i) => {
      fd.set(`date_${day}`, entries[i].work_date)
      fd.set(`hours_${day}`, entries[i].hours || '0')
      fd.set(`desc_${day}`, entries[i].description)
    })
    return fd
  }

  function handleAction(action: 'draft' | 'submit') {
    setError(null)
    startTransition(async () => {
      const result = await saveTimesheet(buildFormData(action))
      if (result?.error) setError(result.error)
    })
  }

  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm space-y-6">
      {/* Week selector */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => changeWeek(-1)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          ← Prev
        </button>
        <span className="text-sm font-semibold text-gray-800">
          Week of {format(monday, 'MMM d, yyyy')} –{' '}
          {format(addDays(monday, 6), 'MMM d, yyyy')}
        </span>
        <button
          type="button"
          onClick={() => changeWeek(1)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Next →
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Day entries */}
      <div className="space-y-3">
        <div className="grid grid-cols-12 gap-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-3">Day</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Hours</div>
          <div className="col-span-5">Description</div>
        </div>
        {entries.map((entry, i) => (
          <div key={i} className="grid grid-cols-12 gap-3 items-center">
            <div className="col-span-3 text-sm font-medium text-gray-700">{dayLabels[i]}</div>
            <div className="col-span-2 text-sm text-gray-500">
              {format(new Date(entry.work_date + 'T00:00:00'), 'MMM d')}
            </div>
            <div className="col-span-2">
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={entry.hours}
                onChange={(e) => updateEntry(i, 'hours', e.target.value)}
                placeholder="0"
                className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-5">
              <input
                type="text"
                value={entry.description}
                onChange={(e) => updateEntry(i, 'description', e.target.value)}
                placeholder="What did you work on?"
                className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <span className="text-sm font-semibold text-gray-700">
          Total: <span className="text-indigo-600">{totalHours}h</span>
        </span>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Any additional notes for this week…"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 justify-end">
        <button
          type="button"
          onClick={() => handleAction('draft')}
          disabled={isPending}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={() => handleAction('submit')}
          disabled={isPending || totalHours === 0}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Submit for Review'}
        </button>
      </div>
    </div>
  )
}
