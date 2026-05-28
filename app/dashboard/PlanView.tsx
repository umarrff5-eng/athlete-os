'use client'
import { useState, useRef } from 'react'

type Component = {
  type: string
  label: string
  date: string
  weight: number
  course: string
  code: string
  courseId: number
  compKey: string
}

type Props = {
  allComponents: Component[]
  activities: any[]
  daysUntil: (date: string) => number | null
  onPlanGenerated?: (plan: any[]) => void
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function PlanView({ allComponents, activities, daysUntil, onPlanGenerated }: Props) {
  const [sports, setSports] = useState({ Run: true, Bike: true, Swim: false })
  const [targets, setTargets] = useState({ Run: '40', Bike: '100', Swim: '10' })
  const [plan, setPlan] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [messages, setMessages] = useState<{role: string, text: string}[]>([])
  const [typing, setTyping] = useState(false)
  const chatInputRef = useRef<HTMLInputElement>(null)

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
    exam: 'Exam mode — rest and recovery only',
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

  const buildPrompt = (customRequest?: string) => {
    const activeSports = Object.entries(sports).filter(([, v]) => v).map(([k]) => k)
    const targetsList = activeSports.map(s => `${s}: ${targets[s as keyof typeof targets]}km/week`).join(', ')
    const recentActivity = activities.slice(0, 5).map((a: any) =>
      `${a.type}: ${(a.distance / 1000).toFixed(1)}km in ${Math.floor(a.moving_time / 60)} min`
    ).join('\n') || 'No recent Strava data'
    const upcomingExams = allComponents
      .filter(c => c.date && (daysUntil(c.date) ?? 999) >= 0)
      .slice(0, 5)
      .map(c => `${c.type} in ${c.course} in ${daysUntil(c.date)} days`)
      .join('\n') || 'No upcoming exams'

    return `Generate a 7-day training plan for a triathlete student-athlete.

Sports selected: ${activeSports.join(', ')}
Weekly targets: ${targetsList}
Load status: ${loadStatus} — ${loadLabel}
Next exam in: ${nextExamDays === 999 ? 'none' : nextExamDays + ' days'}
${customRequest ? `Athlete request: ${customRequest}` : ''}

Recent Strava training:
${recentActivity}

Upcoming academic deadlines:
${upcomingExams}

Return ONLY a JSON array with exactly 7 objects. Each object must have:
- day: string (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
- type: string (Run, Bike, Swim, or Rest)
- name: string (short workout name)
- duration: number (minutes, 0 if rest)
- distance: number (km, 0 if rest)
- intensity: string (Easy, Moderate, Hard, or Rest)
- notes: string (one sentence)

No markdown, no backticks, no text outside the array.`
  }

  const generatePlan = async (customRequest?: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: buildPrompt(customRequest),
          context: { training: '', academic: '' }
        })
      })
      const data = await response.json()
      const match = data.message.match(/\[[\s\S]*\]/)
      const parsed = match ? JSON.parse(match[0]) : null
      if (parsed && parsed.length === 7) {
        setPlan(parsed)
        setGenerated(true)
        if (onPlanGenerated) onPlanGenerated(parsed)
      } else {
        throw new Error('Invalid plan')
      }
    } catch {
      const fallback = DAYS.map((_, i) => ({
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        type: 'Rest', name: 'Rest day', duration: 0, distance: 0, intensity: 'Rest',
        notes: 'Failed to generate — please try again.'
      }))
      setPlan(fallback)
      setGenerated(true)
    }
    setLoading(false)
  }

  const sendChatMessage = async () => {
    const val = chatInputRef.current?.value?.trim()
    if (!val) return
    if (chatInputRef.current) chatInputRef.current.value = ''
    setMessages(m => [...m, { role: 'user', text: val }])
    setTyping(true)

    const isGenerateRequest = val.toLowerCase().includes('generate') ||
      val.toLowerCase().includes('create') ||
      val.toLowerCase().includes('make') ||
      val.toLowerCase().includes('plan')

    if (isGenerateRequest) {
      setMessages(m => [...m, { role: 'ai', text: 'Generating your plan based on your request...' }])
      setTyping(false)
      await generatePlan(val)
      setMessages(m => [...m, { role: 'ai', text: 'Plan generated! Scroll down to see it. You can ask me to adjust anything.' }])
    } else {
      try {
        const recentActivity = activities.slice(0, 5).map((a: any) =>
          `${a.type}: ${(a.distance / 1000).toFixed(1)}km in ${Math.floor(a.moving_time / 60)} min`
        ).join('\n') || 'No recent data'
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: val,
            context: {
              training: recentActivity,
              academic: allComponents.filter(c => c.date).slice(0, 3).map(c => `${c.type}: ${c.label} in ${daysUntil(c.date)} days`).join('\n')
            }
          })
        })
        const data = await response.json()
        setMessages(m => [...m, { role: 'ai', text: data.message }])
      } catch {
        setMessages(m => [...m, { role: 'ai', text: 'Something went wrong. Try again.' }])
      }
    }
    setTyping(false)
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
    <div className="flex-1 overflow-y-auto px-10 py-10">
      <p style={{ color: '#555' }} className="text-xs uppercase tracking-widest mb-2">Training</p>
      <h1 className="text-3xl font-medium text-white mb-8">Weekly plan</h1>

      {/* Load status */}
      <div style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-2xl p-5 mb-6 flex items-center justify-between">
        <div>
          <p style={{ color: '#555' }} className="text-xs uppercase tracking-widest mb-1">Academic load</p>
          <p style={{ color: loadColor }} className="text-base font-medium">{loadLabel}</p>
        </div>
        <p style={{ color: '#444' }} className="text-sm">
          {nextExamDays === 999 ? 'No upcoming exams' : `Next exam in ${nextExamDays} days`}
        </p>
      </div>

      {/* Sport toggles */}
      <div style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-2xl p-6 mb-6">
        <p style={{ color: '#555' }} className="text-xs uppercase tracking-widest mb-5">Sports this week</p>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {(['Run', 'Bike', 'Swim'] as const).map(sport => (
            <button key={sport} onClick={() => toggleSport(sport)}
              style={{
                borderColor: sports[sport]
                  ? sport === 'Run' ? '#4ade80' : sport === 'Bike' ? '#F5C518' : '#60a5fa'
                  : '#2a2a2a',
                background: '#0a0a0a',
                color: sports[sport] ? '#fff' : '#444',
              }}
              className="border rounded-xl p-4 text-left transition">
              <p className="text-base font-medium mb-2">{sport}</p>
              {sports[sport] && (
                <div className="flex items-center gap-2">
                  <input type="number" value={targets[sport]}
                    onChange={e => setTargets(prev => ({ ...prev, [sport]: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                    style={{ background: '#1a1a1a', borderColor: '#333', color: '#fff', width: '70px' }}
                    className="border rounded px-2 py-1 text-sm focus:outline-none" />
                  <span style={{ color: '#555' }} className="text-xs">km/wk</span>
                </div>
              )}
            </button>
          ))}
        </div>
        <button onClick={() => generatePlan()}
          disabled={loading || Object.values(sports).every(v => !v)}
          style={{ background: '#F5C518', color: '#080808' }}
          className="w-full font-semibold text-base py-3.5 rounded-xl hover:opacity-80 transition disabled:opacity-40">
          {loading ? 'Generating plan...' : 'Generate plan'}
        </button>
      </div>

      {/* AI Chat for plan */}
      <div style={{ borderColor: '#2a2a2a', background: '#0d0d0d' }} className="border rounded-2xl p-6 mb-6">
        <p style={{ color: '#555' }} className="text-xs uppercase tracking-widest mb-4">Describe your plan</p>
        <div className="overflow-y-auto mb-4 space-y-3" style={{ height: '120px' }}>
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p style={{ color: '#333' }} className="text-base text-center">Tell me what kind of plan you need.<br />e.g. "I want more running this week" or "Make it easy, I have exams"</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div style={{
                background: m.role === 'user' ? '#1c1c1c' : '#161616',
                color: m.role === 'user' ? '#fff' : '#ccc',
                borderColor: '#2a2a2a', maxWidth: '75%'
              }} className="border text-base px-5 py-3 rounded-2xl leading-relaxed">
                {m.role === 'ai' && <span style={{ color: '#F5C518' }} className="text-sm font-semibold mr-2">AI</span>}
                {m.text}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div style={{ background: '#161616', borderColor: '#2a2a2a', color: '#555' }} className="border text-base px-5 py-3 rounded-2xl">
                <span style={{ color: '#F5C518' }} className="text-sm font-semibold mr-2">AI</span>thinking...
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <input ref={chatInputRef}
            placeholder='e.g. "More cycling, less running" or "Easy week, exams coming"'
            style={{ borderColor: '#2a2a2a', background: '#111', color: '#fff' }}
            className="flex-1 border rounded-xl px-5 py-3.5 text-base placeholder-[#333] focus:outline-none focus:border-[#F5C518] transition"
            onKeyDown={e => { if (e.key === 'Enter') sendChatMessage() }} />
          <button onClick={sendChatMessage}
            style={{ background: '#F5C518', color: '#080808' }}
            className="font-semibold text-base px-7 py-3.5 rounded-xl hover:opacity-80 transition shrink-0">
            Send
          </button>
        </div>
      </div>

      {/* Generated plan */}
      {generated && plan.length > 0 && (
        <div style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-2xl overflow-hidden">
          <div className="px-6 py-4" style={{ borderColor: '#1a1a1a', borderBottomWidth: 1 }}>
            <p style={{ color: '#555' }} className="text-xs uppercase tracking-widest">Generated plan</p>
          </div>
          {plan.map((session, i) => (
            <div key={i} style={{ borderColor: '#1a1a1a' }} className="flex items-center justify-between px-6 py-5 border-b last:border-0">
              <div className="flex items-center gap-4">
                <p style={{ color: '#444' }} className="text-sm w-8 shrink-0">{session.day}</p>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: typeColor(session.type), background: '#111', minWidth: 40 }} className="text-xs px-2 py-0.5 rounded text-center">{session.type}</span>
                    <p className="text-white text-base">{session.name}</p>
                  </div>
                  <p style={{ color: '#555' }} className="text-sm">{session.notes}</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-6">
                {session.duration > 0 && <p className="text-white text-base">{session.duration} min</p>}
                {session.distance > 0 && <p style={{ color: '#555' }} className="text-sm">{session.distance} km</p>}
                <p style={{ color: intensityColor(session.intensity) }} className="text-xs mt-1">{session.intensity}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}