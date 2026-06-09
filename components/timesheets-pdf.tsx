import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    color: '#111827',
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#4f46e5',
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#4f46e5',
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 9,
    color: '#6b7280',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 10,
  },
  statLabel: {
    fontSize: 8,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  table: {
    width: '100%',
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#4f46e5',
    borderRadius: 4,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 7,
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  thCell: {
    paddingVertical: 7,
    paddingHorizontal: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tdCell: {
    paddingHorizontal: 8,
    fontSize: 9,
    color: '#374151',
  },
  colName:   { width: '22%' },
  colWeek:   { width: '18%' },
  colHours:  { width: '10%' },
  colStatus: { width: '14%' },
  colNotes:  { width: '36%' },
  statusText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
})

const statusColor: Record<string, string> = {
  draft:     '#6b7280',
  submitted: '#2563eb',
  approved:  '#16a34a',
  rejected:  '#dc2626',
}

interface TimesheetRow {
  id: string
  user_id: string
  week_start: string
  status: string
  total_hours: number
  notes: string | null
  profiles?: { full_name: string } | null
}

interface Props {
  timesheets: TimesheetRow[]
  exportedBy: string
}

function formatWeek(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TimesheetsPDF({ timesheets, exportedBy }: Props) {
  const totalHours = timesheets.reduce((s, t) => s + Number(t.total_hours), 0)
  const pending    = timesheets.filter(t => t.status === 'submitted').length
  const approved   = timesheets.filter(t => t.status === 'approved').length

  return (
    <Document
      title="LogicalJupiter — Timesheets Export"
      author="LogicalJupiter"
      creator="LogicalJupiter"
    >
      <Page size="A4" style={styles.page}>

        {/* ---- Header ---- */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>LogicalJupiter</Text>
          <Text style={styles.headerSub}>
            Timesheets Export · Exported by {exportedBy} · {formatDate(new Date())}
          </Text>
        </View>

        {/* ---- Stats ---- */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Timesheets</Text>
            <Text style={styles.statValue}>{timesheets.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Hours</Text>
            <Text style={styles.statValue}>{totalHours.toFixed(1)}h</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Pending Review</Text>
            <Text style={styles.statValue}>{pending}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Approved</Text>
            <Text style={styles.statValue}>{approved}</Text>
          </View>
        </View>

        {/* ---- Table ---- */}
        <View style={styles.table}>
          {/* Head */}
          <View style={styles.tableHead}>
            <Text style={[styles.thCell, styles.colName]}>Consultant</Text>
            <Text style={[styles.thCell, styles.colWeek]}>Week of</Text>
            <Text style={[styles.thCell, styles.colHours]}>Hours</Text>
            <Text style={[styles.thCell, styles.colStatus]}>Status</Text>
            <Text style={[styles.thCell, styles.colNotes]}>Notes</Text>
          </View>

          {/* Rows */}
          {timesheets.map((t, i) => (
            <View
              key={t.id}
              style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
              wrap={false}
            >
              <Text style={[styles.tdCell, styles.colName]}>
                {t.profiles?.full_name ?? '—'}
              </Text>
              <Text style={[styles.tdCell, styles.colWeek]}>
                {formatWeek(t.week_start)}
              </Text>
              <Text style={[styles.tdCell, styles.colHours]}>
                {Number(t.total_hours).toFixed(1)}h
              </Text>
              <Text style={[
                styles.tdCell,
                styles.colStatus,
                styles.statusText,
                { color: statusColor[t.status] ?? '#6b7280' },
              ]}>
                {t.status}
              </Text>
              <Text style={[styles.tdCell, styles.colNotes]}>
                {t.notes ?? '—'}
              </Text>
            </View>
          ))}
        </View>

        {/* ---- Footer ---- */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>LogicalJupiter · Confidential</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  )
}
