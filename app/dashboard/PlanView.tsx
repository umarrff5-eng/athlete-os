'use client'
import { useState } from 'react'

type Component = {
  type: string
  label: string
  date: string
  weight: number
  course: string
  code: string
  courseId: number
}

type Props = {
  allComponents: Component[]
  activities: any[]
  daysUntil: (date: string) => number | null
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function PlanView({ allComponents, activities, daysUntil }: Props) {
  const [sports, setSports] = useState({ Run: true, Bike: true, Swim: false })
  const [targets, setTargets] = useState({ Run: '40', Bike: '100', Swim: '10' })
  const [plan, setPlan] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const toggleSport = (sport: string) => {
    setSports(prev => ({ ...prev, [sport]: !prev[sport as keyof typeof prev] }))
  }

  const nextExamDays = allComponents
    .filter(c => c.date)
    .map(c => daysUntil(c.date))
    .filter((d): d is number => d !== null && d >= 0)
    .sort((a, b) => a - b)[0] ?? 999

  const loadStatus = nextExamDays <= 2 ? 'exam' : nextExamDays <= 5 ? 'deload' : nextExamDays <= 10 ? 'reduced' : 'normal'

  const loadLabel = {
    exam: 'Exam mode — rest & recovery only',
    deload: 'Deload week — reduce volume 40%',
    reduced: 'Reduced week — reduce volume 20%',
    normal: 'Normal training week',
  }[loadStatus]

  const loadColor = {
    exam: '#ff4444',
    deload: '#ff8c00',
    reduced: '#F5C518',
    normal: '#4ade80',
  }[loadStatus]

  const generatePlan = async () => {
    setLoading(true)

    const activeSports = Object.entries(sports).filter(([, v]) => v).map(([k]) => k)
    const targetsList = activeSports.map(s => `${s}: ${targets[s as keyof typeof targets]}km/week`).join(', ')

    const recentActivity = activities.slice(0, 5).map((a: any) =>
      `${a.type}: ${(a.distance / 1000).toFixed(1)}km in ${Math.floor(a.moving_time / 60)} min`
    ).join('\n') || 'No recent Strava data'

    const upcomingExams = allComponents
      .filter(c => c.date && (daysUntil(c.date) ?? 999) >= 0)
      .slice(0, 5)
      .map(c => `${c.type} in ${c.course} — in ${daysUntil(c.date)} days`)
      .join('\n') || 'No upcoming exams'

    const prompt = `Generate a 7-day training plan for a triathlete student-athlete.

Sports selected: ${activeSports.join(', ')}
Weekly targets: ${targetsList}
Load status: ${loadStatus} (${loadLabel})
Next exam in: ${nextExamDays} days

Recent training from Strava:
${recentActivity}

Upcoming academic deadlines:
${upcomingExams}

Return ONLY a valid JSON array with exactly 7 objects, one per day. Each object must have:
- day: string (Monday through Sunday)
- type: string (Run, Bike, Swim, or Rest)
- name: string (short workout name)
- duration: number (minutes, 0 if rest)
- distance: number (km, 0 if rest or strength)
- intensity: string (Easy, Moderate, Hard, or Rest)
- notes: string (one sentence coaching note)

Apply the load status: if deload reduce all distances by 40%, if reduced by 20%, if exam make most days Rest.
Do not include markdown, backticks, or any text outside the JSON array.`

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          context: { training: recentActivity, academic: upcomingExams }
        })
      })
      const data = await response.json()
      const parsed = JSON.parse(data.message)
      setPlan(parsed)
      setGenerated(true)
    } catch {
      setPlan(DAYS.map(day => ({
        day,
        type: 'Rest',
        name: 'Rest day',
        duration: 0,
        distance: 0,
        intensity: 'Rest',
        notes: 'Failed to generate — try again.'
      })))
      setGenerated(true)
    }
    setLoading(false)
  }

  const intensityColor = (intensity: string) => {
    const map: Record<string, string> = { Easy: '#4ade80', Moderate: '#F5C518', Hard: '#ff8c00', Rest: '#333' }
    return map[intensity] || '#555'
  }

  const typeColor = (type: string) => {
    const map: Record<string, string> = { Run: '#4ade80', Bike: '#F5C518', Swim: '#60a5fa', Rest: '#333' }
    return map[type] || '#555'
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8">
      <p style={{ color: '#444' }} className="text-xs uppercase tracking-widest mb-1">Training</p>
      <h1 className="text-xl font-medium text-white mb-8">Weekly plan</h1>

      {/* Load status */}
      <div style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-xl p-4 mb-6 flex items-center justify-between">
        <div>
          <p style={{ color: '#444' }} className="text-xs uppercase tracking-widest mb-1">Academic load</p>
          <p style={{ color: loadColor }} className="text-sm font-medium">{loadLabel}</p>
        </div>
        <p style={{ color: '#333' }} className="text-xs">Next exam in {nextExamDays === 999 ? '—' : `${nextExamDays}d`}</p>
      </div>

      {/* Sport toggles */}
      <div style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-xl p-5 mb-4">
        <p style={{ color: '#444' }} className="text-xs uppercase tracking-widest mb-4">Sports this week</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {(['Run', 'Bike', 'Swim'] as const).map(sport => (
            <button
              key={sport}
              onClick={() => toggleSport(sport)}
              style={{
                borderColor: sports[sport] ? (sport === 'Run' ? '#4ade80' : sport === 'Bike' ? '#F5C518' : '#60a5fa') : '#2a2a2a',
                background: sports[sport] ? '#0f0f0f' : 'transparent',
                color: sports[sport] ? '#fff' : '#444',
              }}
              className="border rounded-xl p-3 text-sm transition text-left"
            >
              <p className="font-medium">{sport}</p>
              {sports[sport] && (
                <div className="flex items-center gap-1 mt-2">
                  <input
                    type="number"
                    value={targets[sport]}
                    onChange={e => setTargets(prev => ({ ...prev, [sport]: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                    style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#fff', width: '60px' }}
                    className="border rounded px-2 py-1 text-xs focus:outline-none"
                  />
                  <span style={{ color: '#444' }} className="text-xs">km/wk</span>
                </div>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={generatePlan}
          disabled={loading || Object.values(sports).every(v => !v)}
          style={{ background: '#F5C518', color: '#080808' }}
          className="w-full font-semibold text-sm py-3 rounded-xl hover:opacity-80 transition disabled:opacity-40">
          {loading ? 'Generating plan...' : 'Generate plan'}
        </button>
      </div>

      {/* Generated plan */}
      {generated && plan.length > 0 && (
        <div style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-xl overflow-hidden">
          {plan.map((session, i) => (
            <div key={i} style={{ borderColor: '#1a1a1a' }} className="flex items-center justify-between px-5 py-4 border-b last:border-0">
              <div className="flex items-center gap-4">
                <p style={{ color: '#333' }} className="text-xs w-20 shrink-0">{session.day}</p>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span style={{ color: typeColor(session.type), background: '#111', minWidth: 36 }} className="text-xs px-1.5 py-0.5 rounded text-center">{session.type}</span>
                    <p className="text-white text-sm">{session.name}</p>
                  </div>
                  <p style={{ color: '#444' }} className="text-xs">{session.notes}</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-4">
                {session.duration > 0 && <p className="text-white text-sm">{session.duration} min</p>}
                {session.distance > 0 && <p style={{ color: '#444' }} className="text-xs">{session.distance} km</p>}
                <p style={{ color: intensityColor(session.intensity) }} className="text-xs mt-0.5">{session.intensity}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}