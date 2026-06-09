'use client'

import { useState, useTransition } from 'react'
import { reviewVacation } from '../actions'

export default function ReviewVacationForm({ id }: { id: string }) {
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function submit(decision: 'approved' | 'rejected') {
    const fd = new FormData()
    fd.set('id', id)
    fd.set('decision', decision)
    fd.set('review_notes', notes)
    startTransition(async () => {
      await reviewVacation(fd)
      setDone(true)
    })
  }

  if (done) {
    return <p className="text-sm text-green-600 font-medium">Review submitted.</p>
  }

  return (
    <div className="space-y-3">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Review notes (optional)…"
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => submit('approved')}
          disabled={isPending}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => submit('rejected')}
          disabled={isPending}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </div>
  )
}
