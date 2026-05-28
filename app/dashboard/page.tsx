'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import PlanView from './PlanView'

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'plan', label: 'Plan' },
  { id: 'training', label: 'Training' },
  { id: 'courses', label: 'Courses' },
  { id: 'settings', label: 'Settings' },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function daysUntil(dateStr: string) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function getThisWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function typeColor(type: string) {
  const map: Record<string, string> = { Quiz: '#F5C518', Assignment: '#888', Mid: '#ff8c00', Final: '#ff4444' }
  return map[type] || '#555'
}

function workoutColor(type: string) {
  const map: Record<string, string> = { Run: '#4ade80', Ride: '#F5C518', Swim: '#60a5fa' }
  return map[type] || '#555'
}

const EMPTY_COURSE = { name: '', code: '', num_quizzes: '0', quiz_weight: '0', num_assignments: '0', assign_weight: '0', mid_weight: '0', final_weight: '0' }

export default function Dashboard() {
  const router = useRouter()
  const [activeNav, setActiveNav] = useState('dashboard')
  const [profile, setProfile] = useState<any>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [dbCourses, setDbCourses] = useState<any[]>([])
  const [selectedActivity, setSelectedActivity] = useState<any>(null)
  const [messages, setMessages] = useState<{role: string, text: string}[]>([])
  const [typing, setTyping] = useState(false)
  const [userName, setUserName] = useState('Athlete')
  const [generatedPlan, setGeneratedPlan] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('athlete_plan')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [editingComponent, setEditingComponent] = useState<string | null>(null)
  const [componentDates, setComponentDates] = useState<Record<string, string>>({})
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [newCourse, setNewCourse] = useState(EMPTY_COURSE)
  const [savingCourse, setSavingCourse] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('access_token')
    if (urlToken) {
      localStorage.setItem('strava_token', urlToken)
      setAccessToken(urlToken)
      window.history.replaceState({}, '', '/dashboard')
    } else {
      const saved = localStorage.getItem('strava_token')
      if (saved) setAccessToken(saved)
    }
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserName(user.email?.split('@')[0] || 'Athlete')
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profileData) setProfile(profileData)
      const { data: courseData } = await supabase.from('courses').select('*').eq('user_id', user.id)
      if (courseData) setDbCourses(courseData)
    }
    loadData()
  }, [])

  useEffect(() => {
    if (!accessToken) return
    const fetchActivities = () => {
      fetch(`/api/strava?access_token=${accessToken}`)
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setActivities(data) })
        .catch(() => {})
    }
    fetchActivities()
    const interval = setInterval(fetchActivities, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [accessToken])

  const thisWeekActivities = activities.filter((a: any) => {
    const actDate = new Date(a.start_date)
    return actDate >= getThisWeekStart()
  })

  const runKm = thisWeekActivities.filter((a: any) => a.type === 'Run').reduce((s: number, a: any) => s + (a.distance || 0) / 1000, 0).toFixed(1)
  const swimKm = thisWeekActivities.filter((a: any) => a.type === 'Swim').reduce((s: number, a: any) => s + (a.distance || 0) / 1000, 0).toFixed(1)
  const rideKm = thisWeekActivities.filter((a: any) => a.type === 'Ride').reduce((s: number, a: any) => s + (a.distance || 0) / 1000, 0).toFixed(1)

  const allComponents = dbCourses.flatMap(c => {
    const comps: any[] = []
    for (let i = 1; i <= (c.num_quizzes || 0); i++) {
      comps.push({ type: 'Quiz', label: `Quiz ${i}`, weight: Math.round(c.quiz_weight / (c.num_quizzes || 1)), course: c.name, code: c.code, courseId: c.id, compKey: `${c.id}-quiz-${i}` })
    }
    for (let i = 1; i <= (c.num_assignments || 0); i++) {
      comps.push({ type: 'Assignment', label: `Assignment ${i}`, weight: Math.round(c.assign_weight / (c.num_assignments || 1)), course: c.name, code: c.code, courseId: c.id, compKey: `${c.id}-assign-${i}` })
    }
    if (c.mid_weight > 0) comps.push({ type: 'Mid', label: 'Midterm', weight: c.mid_weight, course: c.name, code: c.code, courseId: c.id, compKey: `${c.id}-mid` })
    if (c.final_weight > 0) comps.push({ type: 'Final', label: 'Final Exam', weight: c.final_weight, course: c.name, code: c.code, courseId: c.id, compKey: `${c.id}-final` })
    return comps
  })

  const componentsWithDates = allComponents.map(c => ({
    ...c,
    date: componentDates[c.compKey] || ''
  })).sort((a, b) => {
    if (!a.date) return 1
    if (!b.date) return -1
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  const updateComponentDate = (compKey: string, date: string) => {
    setComponentDates(prev => ({ ...prev, [compKey]: date }))
    setEditingComponent(null)
  }

  const addCourse = async () => {
    setSavingCourse(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('courses').insert({
        user_id: user.id,
        name: newCourse.name,
        code: newCourse.code,
        num_quizzes: parseInt(newCourse.num_quizzes) || 0,
        quiz_weight: parseFloat(newCourse.quiz_weight) || 0,
        num_assignments: parseInt(newCourse.num_assignments) || 0,
        assign_weight: parseFloat(newCourse.assign_weight) || 0,
        mid_weight: parseFloat(newCourse.mid_weight) || 0,
        final_weight: parseFloat(newCourse.final_weight) || 0,
      }).select()
      if (data) setDbCourses(prev => [...prev, ...data])
    }
    setNewCourse(EMPTY_COURSE)
    setShowAddCourse(false)
    setSavingCourse(false)
  }

  const handleStravaConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
    window.location.href = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${window.location.origin}/api/auth/callback&response_type=code&scope=activity:read_all`
  }

  const handleStravaDisconnect = () => {
    localStorage.removeItem('strava_token')
    setAccessToken(null)
    setActivities([])
  }

  const sendMessage = async () => {
    const val = inputRef.current?.value?.trim()
    if (!val) return
    const userMessage = val
    if (inputRef.current) inputRef.current.value = ''
    setMessages(m => [...m, { role: 'user', text: userMessage }])
    setTyping(true)
    try {
      const trainingContext = thisWeekActivities.length > 0
        ? thisWeekActivities.map((a: any) =>
            `${new Date(a.start_date).toLocaleDateString('en-US', { weekday: 'short' })}: ${a.name} (${a.type}) - ${Math.floor(a.moving_time / 60)} min - ${(a.distance / 1000).toFixed(1)}km`
          ).join('\n')
        : 'No activities this week yet'
      const academicContext = componentsWithDates.filter(c => c.date).slice(0, 5).map(c =>
        `${c.type}: ${c.label} (${c.course}) - due in ${daysUntil(c.date)} days - weight: ${c.weight}%`
      ).join('\n') || 'No dated assessments yet'
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, context: { training: trainingContext, academic: academicContext } })
      })
      const data = await response.json()
      setMessages(m => [...m, { role: 'ai', text: data.message }])
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Something went wrong. Try again.' }])
    }
    setTyping(false)
  }

  const renderDashboard = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-10 pt-10 pb-6 shrink-0">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p style={{ color: '#444' }} className="text-xs uppercase tracking-widest mb-2">{today}</p>
            <h1 className="text-3xl font-medium text-white">{getGreeting()}, {userName}</h1>
          </div>
          <div className="flex items-center gap-3">
            {accessToken ? (
              <>
                <span style={{ color: '#F5C518', borderColor: '#2a2200' }} className="text-sm border px-4 py-2 rounded-full">● Strava live</span>
                <button
                  onClick={() => {
                    const token = localStorage.getItem('strava_token')
                    if (!token) return
                    fetch(`/api/strava?access_token=${token}`)
                      .then(r => r.json())
                      .then(data => { if (Array.isArray(data)) setActivities(data) })
                  }}
                  style={{ color: '#555', borderColor: '#2a2a2a' }}
                  className="text-sm border px-4 py-2 rounded-full hover:text-white transition">
                  ↻ Refresh
                </button>
              </>
            ) : (
              <button onClick={handleStravaConnect}
                style={{ color: '#F5C518', borderColor: '#2a2200' }}
                className="text-sm border px-4 py-2 rounded-full hover:bg-[#1a1400] transition">
                Connect Strava
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Run this week', value: runKm + ' km' },
            { label: 'Swim this week', value: swimKm + ' km' },
            { label: 'Cycle this week', value: rideKm + ' km' },
            { label: 'Sessions', value: String(thisWeekActivities.length) },
          ].map((card, i) => (
            <div key={i} style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-2xl p-6">
              <p style={{ color: '#555' }} className="text-sm mb-3">{card.label}</p>
              <p className="text-4xl font-medium text-white">{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 px-10 mb-4" style={{ height: '220px' }}>
        <div style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-2xl p-6 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-5 shrink-0">
            <p style={{ color: '#555' }} className="text-sm uppercase tracking-widest">This week plan</p>
            <button onClick={() => setActiveNav('plan')}
              style={{ color: '#444', borderColor: '#2a2a2a' }}
              className="text-sm border px-3 py-1.5 rounded-lg hover:text-white transition">
              {generatedPlan.length > 0 ? 'Edit plan →' : 'Generate plan →'}
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {generatedPlan.length > 0 ? (
              generatedPlan.map((w: any, i: number) => (
                <div key={i} style={{ borderColor: '#1a1a1a' }} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="text-white text-base">{w.name}</p>
                    <p style={{ color: '#555' }} className="text-sm mt-0.5">
                      {w.day}{w.duration > 0 ? ` · ${w.duration} min` : ''}{w.distance > 0 ? ` · ${w.distance} km` : ''}
                    </p>
                  </div>
                  <p style={{ color: workoutColor(w.type) }} className="text-sm shrink-0">
                    {w.type !== 'Rest' ? w.type : 'Rest'}
                  </p>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <p style={{ color: '#333' }} className="text-base text-center">No plan generated yet</p>
                <button onClick={() => setActiveNav('plan')}
                  style={{ color: '#F5C518', borderColor: '#2a2200' }}
                  className="text-sm border px-4 py-2 rounded-lg hover:bg-[#1a1400] transition">
                  Generate plan →
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-2xl p-6 flex flex-col overflow-hidden">
          <p style={{ color: '#555' }} className="text-sm uppercase tracking-widest mb-5 shrink-0">Upcoming assessments</p>
          <div className="overflow-y-auto flex-1">
            {componentsWithDates.length > 0 ? (
              componentsWithDates.slice(0, 8).map((comp, i) => {
                const days = comp.date ? daysUntil(comp.date) : null
                return (
                  <div key={i} style={{ borderColor: '#1a1a1a' }} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <span style={{ color: typeColor(comp.type), background: '#111', minWidth: 80 }} className="text-xs px-2 py-1.5 rounded text-center shrink-0">{comp.type}</span>
                      <div>
                        <p className="text-white text-base">{comp.label}</p>
                        <p style={{ color: '#555' }} className="text-sm mt-0.5">{comp.code}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      {comp.date ? (
                        <p style={{ color: days !== null && days <= 3 ? '#ff4444' : days !== null && days <= 7 ? '#F5C518' : '#666' }} className="text-base font-medium">
                          {days !== null && days >= 0 ? `${days}d` : 'past'}
                        </p>
                      ) : (
                        <p style={{ color: '#333' }} className="text-sm">No date yet</p>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <p style={{ color: '#333' }} className="text-base text-center">No courses added yet</p>
                <button onClick={() => setActiveNav('courses')}
                  style={{ color: '#F5C518', borderColor: '#2a2200' }}
                  className="text-sm border px-4 py-2 rounded-lg hover:bg-[#1a1400] transition">
                  Add courses →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-10 pb-8 shrink-0">
        <div style={{ borderColor: '#2a2a2a', background: '#0d0d0d' }} className="border rounded-2xl p-6">
          <div className="overflow-y-auto mb-4 space-y-3" style={{ height: '120px' }}>
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p style={{ color: '#333' }} className="text-base">Ask anything about your training or schedule</p>
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
            <input ref={inputRef}
              placeholder="Ask about your week..."
              style={{ borderColor: '#2a2a2a', background: '#111', color: '#fff' }}
              className="flex-1 border rounded-xl px-5 py-3.5 text-base placeholder-[#333] focus:outline-none focus:border-[#F5C518] transition"
              onKeyDown={e => { if (e.key === 'Enter') sendMessage() }} />
            <button onClick={sendMessage}
              style={{ background: '#F5C518', color: '#080808' }}
              className="font-semibold text-base px-7 py-3.5 rounded-xl hover:opacity-80 transition shrink-0">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderTraining = () => (
    <div className="flex-1 overflow-y-auto px-10 py-10">
      <p style={{ color: '#555' }} className="text-xs uppercase tracking-widest mb-2">Training</p>
      <h1 className="text-3xl font-medium text-white mb-10">Recent activities</h1>
      {selectedActivity ? (
        <div>
          <button onClick={() => setSelectedActivity(null)} style={{ color: '#555' }} className="text-base mb-8 hover:text-white transition block">← Back</button>
          <div style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-2xl p-8">
            <div className="flex items-start justify-between mb-8">
              <div>
                <p style={{ color: '#555' }} className="text-sm mb-2">{selectedActivity.date} · {selectedActivity.type}</p>
                <h2 className="text-white text-2xl font-medium">{selectedActivity.name}</h2>
              </div>
              <span style={{ color: '#F5C518' }} className="text-xl font-medium">
                {selectedActivity.distance ? `${selectedActivity.distance.toFixed(1)} km` : ''}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Duration', value: selectedActivity.duration },
                { label: 'Pace / Speed', value: selectedActivity.pace || '—' },
                { label: 'Heart rate', value: selectedActivity.hr || '—' },
              ].map((s, i) => (
                <div key={i} style={{ background: '#161616' }} className="rounded-xl p-5">
                  <p style={{ color: '#555' }} className="text-sm mb-2">{s.label}</p>
                  <p className="text-white text-lg font-medium">{s.value}</p>
                </div>
              ))}
            </div>
            <div style={{ borderColor: '#222' }} className="border-t pt-6">
              <p style={{ color: '#555' }} className="text-xs uppercase tracking-widest mb-3">AI Analysis</p>
              <p style={{ color: '#999' }} className="text-base leading-relaxed">{selectedActivity.description}</p>
            </div>
          </div>
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p style={{ color: '#333' }} className="text-base mb-4">No activities found</p>
          {!accessToken && (
            <button onClick={handleStravaConnect}
              style={{ color: '#F5C518', borderColor: '#2a2200' }}
              className="text-sm border px-4 py-2 rounded-lg hover:bg-[#1a1400] transition">
              Connect Strava
            </button>
          )}
        </div>
      ) : (
        <div>
          {activities.slice(0, 20).map((a: any) => (
            <div key={a.id}
              onClick={() => setSelectedActivity({
                id: a.id, name: a.name, type: a.type,
                date: a.start_date?.split('T')[0],
                duration: `${Math.floor(a.moving_time / 60)} min`,
                distance: a.distance ? a.distance / 1000 : null,
                pace: null, hr: null,
                description: 'Connect Claude API for AI-powered activity analysis.',
              })}
              style={{ borderColor: '#1a1a1a' }}
              className="flex items-center justify-between py-5 border-b last:border-0 cursor-pointer hover:opacity-70 transition">
              <div>
                <p className="text-white text-base">{a.name}</p>
                <p style={{ color: '#555' }} className="text-sm mt-1">
                  {a.start_date?.split('T')[0]} · {a.type} · {Math.floor(a.moving_time / 60)} min
                </p>
              </div>
              <div className="flex items-center gap-6">
                {a.distance > 0 && <p className="text-white text-base">{(a.distance / 1000).toFixed(1)} km</p>}
                <span style={{ color: '#333' }} className="text-base">→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderCourses = () => (
    <div className="flex-1 overflow-y-auto px-10 py-10">
      <div className="flex items-center justify-between mb-10">
        <div>
          <p style={{ color: '#555' }} className="text-xs uppercase tracking-widest mb-2">Academic</p>
          <h1 className="text-3xl font-medium text-white">Courses</h1>
        </div>
        <button onClick={() => setShowAddCourse(!showAddCourse)}
          style={{ background: '#F5C518', color: '#080808' }}
          className="font-semibold text-sm px-5 py-2.5 rounded-xl hover:opacity-80 transition">
          + Add course
        </button>
      </div>

      {showAddCourse && (
        <div style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-2xl p-6 mb-8">
          <h2 className="text-white text-lg font-medium mb-6">New course</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p style={{ color: '#555' }} className="text-sm mb-2">Course name</p>
              <input type="text" placeholder="e.g. Data Structures"
                value={newCourse.name} onChange={e => setNewCourse(p => ({ ...p, name: e.target.value }))}
                style={{ borderColor: '#2a2a2a', background: '#111', color: '#fff' }}
                className="w-full border rounded-xl px-4 py-3 text-base placeholder-[#333] focus:outline-none focus:border-[#F5C518]" />
            </div>
            <div>
              <p style={{ color: '#555' }} className="text-sm mb-2">Course code</p>
              <input type="text" placeholder="e.g. CS201"
                value={newCourse.code} onChange={e => setNewCourse(p => ({ ...p, code: e.target.value }))}
                style={{ borderColor: '#2a2a2a', background: '#111', color: '#fff' }}
                className="w-full border rounded-xl px-4 py-3 text-base placeholder-[#333] focus:outline-none focus:border-[#F5C518]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }} className="border rounded-xl p-4">
              <p className="text-white text-sm font-medium mb-3">Quizzes</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p style={{ color: '#555' }} className="text-xs mb-1">Count</p>
                  <input type="number" placeholder="0" min="0"
                    value={newCourse.num_quizzes} onChange={e => setNewCourse(p => ({ ...p, num_quizzes: e.target.value }))}
                    style={{ borderColor: '#2a2a2a', background: '#111', color: '#fff' }}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <p style={{ color: '#555' }} className="text-xs mb-1">Weight %</p>
                  <input type="number" placeholder="0" min="0" max="100"
                    value={newCourse.quiz_weight} onChange={e => setNewCourse(p => ({ ...p, quiz_weight: e.target.value }))}
                    style={{ borderColor: '#2a2a2a', background: '#111', color: '#fff' }}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
            </div>
            <div style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }} className="border rounded-xl p-4">
              <p className="text-white text-sm font-medium mb-3">Assignments</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p style={{ color: '#555' }} className="text-xs mb-1">Count</p>
                  <input type="number" placeholder="0" min="0"
                    value={newCourse.num_assignments} onChange={e => setNewCourse(p => ({ ...p, num_assignments: e.target.value }))}
                    style={{ borderColor: '#2a2a2a', background: '#111', color: '#fff' }}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <p style={{ color: '#555' }} className="text-xs mb-1">Weight %</p>
                  <input type="number" placeholder="0" min="0" max="100"
                    value={newCourse.assign_weight} onChange={e => setNewCourse(p => ({ ...p, assign_weight: e.target.value }))}
                    style={{ borderColor: '#2a2a2a', background: '#111', color: '#fff' }}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }} className="border rounded-xl p-4">
              <p className="text-white text-sm font-medium mb-3">Midterm</p>
              <p style={{ color: '#555' }} className="text-xs mb-1">Weight %</p>
              <input type="number" placeholder="0" min="0" max="100"
                value={newCourse.mid_weight} onChange={e => setNewCourse(p => ({ ...p, mid_weight: e.target.value }))}
                style={{ borderColor: '#2a2a2a', background: '#111', color: '#fff' }}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }} className="border rounded-xl p-4">
              <p className="text-white text-sm font-medium mb-3">Final</p>
              <p style={{ color: '#555' }} className="text-xs mb-1">Weight %</p>
              <input type="number" placeholder="0" min="0" max="100"
                value={newCourse.final_weight} onChange={e => setNewCourse(p => ({ ...p, final_weight: e.target.value }))}
                style={{ borderColor: '#2a2a2a', background: '#111', color: '#fff' }}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAddCourse(false)}
              style={{ borderColor: '#2a2a2a', color: '#555' }}
              className="flex-1 border py-3 rounded-xl text-base hover:text-white transition">
              Cancel
            </button>
            <button onClick={addCourse} disabled={!newCourse.name || !newCourse.code || savingCourse}
              style={{ background: '#F5C518', color: '#080808' }}
              className="flex-1 font-semibold py-3 rounded-xl text-base hover:opacity-80 transition disabled:opacity-40">
              {savingCourse ? 'Saving...' : 'Add course'}
            </button>
          </div>
        </div>
      )}

      {dbCourses.length === 0 && !showAddCourse ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p style={{ color: '#333' }} className="text-base mb-2">No courses added yet</p>
          <p style={{ color: '#222' }} className="text-sm mb-6">Add your courses to track assessments and exam dates</p>
          <button onClick={() => setShowAddCourse(true)}
            style={{ background: '#F5C518', color: '#080808' }}
            className="font-semibold text-sm px-5 py-2.5 rounded-xl hover:opacity-80 transition">
            + Add your first course
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {dbCourses.map(course => {
            const courseComps = componentsWithDates.filter(c => c.courseId === course.id)
            return (
              <div key={course.id} style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-white text-xl font-medium">{course.name}</h2>
                    <p style={{ color: '#555' }} className="text-sm mt-1">{course.code}</p>
                  </div>
                  <div className="flex gap-6 text-right">
                    {course.num_quizzes > 0 && <div>
                      <p style={{ color: '#555' }} className="text-xs">Quizzes</p>
                      <p className="text-white text-base">{course.num_quizzes}x · {course.quiz_weight}%</p>
                    </div>}
                    {course.num_assignments > 0 && <div>
                      <p style={{ color: '#555' }} className="text-xs">Assignments</p>
                      <p className="text-white text-base">{course.num_assignments}x · {course.assign_weight}%</p>
                    </div>}
                    {course.mid_weight > 0 && <div>
                      <p style={{ color: '#555' }} className="text-xs">Mid</p>
                      <p className="text-white text-base">{course.mid_weight}%</p>
                    </div>}
                    {course.final_weight > 0 && <div>
                      <p style={{ color: '#555' }} className="text-xs">Final</p>
                      <p className="text-white text-base">{course.final_weight}%</p>
                    </div>}
                  </div>
                </div>
                {courseComps.length > 0 && (
                  <div style={{ borderColor: '#1a1a1a' }} className="border-t pt-4">
                    {courseComps.map((comp, i) => {
                      const days = comp.date ? daysUntil(comp.date) : null
                      const editKey = comp.compKey
                      return (
                        <div key={i} style={{ borderColor: '#1a1a1a' }} className="flex items-center justify-between py-4 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <span style={{ color: typeColor(comp.type), background: '#111', minWidth: 90 }} className="text-xs px-3 py-1.5 rounded text-center">{comp.type}</span>
                            <p className="text-white text-base">{comp.label}</p>
                          </div>
                          <div className="text-right shrink-0">
                            {editingComponent === editKey ? (
                              <input type="date" autoFocus
                                style={{ background: '#111', borderColor: '#F5C518', color: '#fff' }}
                                className="border rounded px-3 py-1.5 text-sm focus:outline-none"
                                onBlur={e => updateComponentDate(editKey, e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && updateComponentDate(editKey, (e.target as HTMLInputElement).value)}
                              />
                            ) : comp.date ? (
                              <div className="cursor-pointer" onClick={() => setEditingComponent(editKey)}>
                                <p style={{ color: days !== null && days <= 3 ? '#ff4444' : days !== null && days <= 7 ? '#F5C518' : '#666' }} className="text-base font-medium">
                                  {days !== null && days >= 0 ? `${days}d` : 'past'}
                                </p>
                                <p style={{ color: '#444' }} className="text-sm">{comp.date}</p>
                              </div>
                            ) : (
                              <button onClick={() => setEditingComponent(editKey)}
                                style={{ color: '#444', borderColor: '#333' }}
                                className="text-sm border px-3 py-1.5 rounded hover:text-white hover:border-[#F5C518] transition">
                                + add date
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderSettings = () => (
    <div className="flex-1 overflow-y-auto px-10 py-10">
      <p style={{ color: '#555' }} className="text-xs uppercase tracking-widest mb-2">Account</p>
      <h1 className="text-3xl font-medium text-white mb-10">Settings</h1>

      <p style={{ color: '#444' }} className="text-xs uppercase tracking-widest mb-4">Integrations</p>
      <div style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-2xl p-6 mb-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-lg font-medium">Strava</p>
            <p style={{ color: accessToken ? '#F5C518' : '#555' }} className="text-base mt-1">
              {accessToken ? `● ${activities.length} activities synced` : '○ Not connected'}
            </p>
          </div>
          {accessToken ? (
            <button onClick={handleStravaDisconnect}
              style={{ borderColor: '#2a0000', color: '#ff4444' }}
              className="text-base border px-5 py-2.5 rounded-xl hover:bg-[#1a0000] transition">
              Disconnect
            </button>
          ) : (
            <button onClick={handleStravaConnect}
              style={{ borderColor: '#2a2200', color: '#F5C518' }}
              className="text-base border px-5 py-2.5 rounded-xl hover:bg-[#1a1400] transition">
              Connect Strava
            </button>
          )}
        </div>
      </div>

      <p style={{ color: '#444' }} className="text-xs uppercase tracking-widest mb-4">Profile</p>
      <div style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-2xl overflow-hidden mb-8">
        {profile && [
          { label: 'Sport', value: profile.sports || '—' },
          { label: 'Fitness level', value: profile.fitness_level || '—' },
          { label: 'Goal', value: profile.goal_time || '—' },
          { label: 'Weekly target', value: profile.weekly_hours ? `${profile.weekly_hours} hrs` : '—' },
          { label: 'Event in', value: profile.months_to_event ? `${profile.months_to_event} months` : '—' },
        ].map((item, i) => (
          <div key={i} style={{ borderColor: '#1a1a1a' }} className="flex items-center justify-between px-6 py-5 border-b last:border-0">
            <p style={{ color: '#555' }} className="text-base">{item.label}</p>
            <p className="text-white text-base capitalize">{item.value}</p>
          </div>
        ))}
      </div>

      <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}
        style={{ borderColor: '#2a2a2a', color: '#555' }}
        className="text-base border px-6 py-3 rounded-xl hover:text-red-400 hover:border-red-900 transition">
        Sign out
      </button>
    </div>
  )

  const renderView = () => {
    switch (activeNav) {
      case 'dashboard': return renderDashboard()
      case 'plan': return <PlanView allComponents={componentsWithDates} activities={activities} daysUntil={daysUntil} onPlanGenerated={(plan) => {
        setGeneratedPlan(plan)
        localStorage.setItem('athlete_plan', JSON.stringify(plan))
      }} />
      case 'training': return renderTraining()
      case 'courses': return renderCourses()
      case 'settings': return renderSettings()
      default: return renderDashboard()
    }
  }

  return (
    <div style={{ background: '#080808' }} className="flex h-screen text-white overflow-hidden">
      <aside style={{ borderColor: '#161616', background: '#080808' }} className="w-52 border-r flex flex-col py-8 px-5 shrink-0">
        <div className="flex items-center gap-3 mb-12 px-1">
          <div style={{ background: '#F5C518' }} className="w-7 h-7 rounded-lg flex items-center justify-center">
            <span style={{ color: '#080808' }} className="text-sm font-black">A</span>
          </div>
          <span className="text-white text-base font-medium">Athlete OS</span>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map(item => (
            <button key={item.id} onClick={() => setActiveNav(item.id)}
              style={{
                background: activeNav === item.id ? '#141400' : 'transparent',
                color: activeNav === item.id ? '#F5C518' : '#555',
              }}
              className="w-full text-left px-4 py-3 rounded-xl text-base transition hover:text-white">
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-1 pt-5" style={{ borderTopWidth: 1, borderColor: '#161616' }}>
          <p style={{ color: '#444' }} className="text-sm truncate mb-2">{userName}</p>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}
            style={{ color: '#333' }} className="text-sm hover:text-red-400 transition">
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {renderView()}
        <div className="pb-3 shrink-0 text-center">
          <p style={{ color: '#F5C518', opacity: 0.2 }} className="text-xs tracking-widest uppercase">
            Powered by Umar Farooq — Pakistan's Fastest Olympic Distance Triathlete
          </p>
        </div>
      </main>
    </div>
  )
}