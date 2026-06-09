'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reviewTimesheet } from '../actions'

export default function ReviewTimesheetForm({ id }: { id: string }) {
  const router = useRouter()
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null)

  function submit(action: 'approved' | 'rejected') {
    if (action === 'rejected' && !notes.trim()) {
      setError('A rejection comment is required.')
      return
    }
    setError(null)

    const fd = new FormData()
    fd.set('id', id)
    fd.set('decision', action)
    fd.set('review_notes', notes.trim())

    startTransition(async () => {
      const result = await reviewTimesheet(fd)
      if (result?.error) {
        setError(result.error)
        return
      }
      setDecision(action)
      router.refresh()
    })
  }

  if (decision) {
    return (
      <p className={`text-sm font-medium ${decision === 'approved' ? 'text-green-600' : 'text-red-600'}`}>
        Timesheet {decision}.{notes.trim() && ` Note: "${notes.trim()}"`}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value)
            if (error) setError(null)
          }}
          rows={2}
          placeholder="Review notes (required for rejection)…"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {error && (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => submit('approved')}
          disabled={isPending}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Approve'}
        </button>
        <button
          type="button"
          onClick={() => submit('rejected')}
          disabled={isPending}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Reject'}
        </button>
      </div>
    </div>
  )
}
