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

const DUMMY_COURSES = [
  { id: 1, name: 'Exercise Physiology', code: 'EP301', components: [
    { type: 'Quiz', label: 'Quiz 1', date: '2025-06-02', weight: 5 },
    { type: 'Assignment', label: 'Lab Report', date: '2025-05-29', weight: 10 },
    { type: 'Mid', label: 'Midterm', date: '2025-06-15', weight: 30 },
    { type: 'Final', label: 'Final Exam', date: '2025-07-10', weight: 35 },
  ]},
  { id: 2, name: 'Sports Nutrition', code: 'SN201', components: [
    { type: 'Quiz', label: 'Quiz 1', date: '2025-06-03', weight: 5 },
    { type: 'Quiz', label: 'Quiz 2', date: '', weight: 5 },
    { type: 'Assignment', label: 'Diet Analysis', date: '2025-06-20', weight: 15 },
    { type: 'Mid', label: 'Midterm', date: '2025-06-18', weight: 25 },
    { type: 'Final', label: 'Final Exam', date: '2025-07-12', weight: 40 },
  ]},
  { id: 3, name: 'Biomechanics', code: 'BM401', components: [
    { type: 'Assignment', label: 'Motion Analysis', date: '2025-06-10', weight: 25 },
    { type: 'Mid', label: 'Midterm', date: '2025-06-20', weight: 30 },
    { type: 'Final', label: 'Final Exam', date: '2025-07-15', weight: 35 },
  ]},
]

const DUMMY_WORKOUTS = [
  { id: 1, name: 'Easy run', type: 'Run', day: 'Mon', duration: '45 min', distance: 8.2, date: '2025-05-26', pace: '5:30/km', hr: '138 bpm', description: 'Solid aerobic base session. Heart rate stayed controlled throughout.' },
  { id: 2, name: 'Strength session', type: 'Strength', day: 'Tue', duration: '60 min', distance: null, date: '2025-05-27', pace: null, hr: null, description: 'Full body strength work. Focus on posterior chain.' },
  { id: 3, name: 'Tempo ride', type: 'Ride', day: 'Wed', duration: '90 min', distance: 35, date: '2025-05-28', pace: '28 km/h avg', hr: '158 bpm', description: 'Strong tempo effort. Power output consistent across the ride.' },
  { id: 4, name: 'Recovery swim', type: 'Swim', day: 'Thu', duration: '40 min', distance: 2, date: '2025-05-29', pace: '2:00/100m', hr: '125 bpm', description: 'Easy recovery swim. Technique focus on catch and pull.' },
  { id: 5, name: 'Long run', type: 'Run', day: 'Fri', duration: '75 min', distance: 14, date: '2025-05-30', pace: '5:22/km', hr: '142 bpm', description: 'Long aerobic run. Negative split — second half faster than first.' },
  { id: 6, name: 'Brick session', type: 'Ride', day: 'Sat', duration: '120 min', distance: 45, date: '2025-05-31', pace: '27 km/h avg', hr: '162 bpm', description: 'Bike to run brick. Legs adapted well after 5 min transition.' },
]

const PLANNED_WORKOUTS = [
  { day: 'Mon', name: 'Easy run', type: 'Run', duration: '45 min', distance: '8 km' },
  { day: 'Tue', name: 'Strength', type: 'Strength', duration: '60 min', distance: null },
  { day: 'Wed', name: 'Tempo ride', type: 'Ride', duration: '90 min', distance: '35 km' },
  { day: 'Thu', name: 'Recovery swim', type: 'Swim', duration: '40 min', distance: '2 km' },
  { day: 'Fri', name: 'Long run', type: 'Run', duration: '75 min', distance: '14 km' },
  { day: 'Sat', name: 'Long ride', type: 'Ride', duration: '2 hrs', distance: '60 km' },
  { day: 'Sun', name: 'Rest', type: 'Rest', duration: null, distance: null },
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

function typeColor(type: string) {
  const map: Record<string, string> = { Quiz: '#F5C518', Assignment: '#888', Mid: '#ff8c00', Final: '#ff4444' }
  return map[type] || '#555'
}

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
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [courseComponents, setCourseComponents] = useState(DUMMY_COURSES)
  const inputRef = useRef<HTMLInputElement>(null)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  useEffect(() => {
    const token = localStorage.getItem('strava_token')
    if (token) setAccessToken(token)
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserName(user.email?.split('@')[0] || 'Athlete')
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profileData) setProfile(profileData)
      const { data: courseData } = await supabase.from('courses').select('*').eq('user_id', user.id)
      if (courseData && courseData.length > 0) setDbCourses(courseData)
    }
    loadData()
  }, [])

  useEffect(() => {
    if (!accessToken) return
    
    const fetchActivities = () => {
      fetch(`/api/strava?access_token=${accessToken}`)
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setActivities(data) })
    }

    fetchActivities()
    const interval = setInterval(fetchActivities, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [accessToken])
  
  const workouts = activities.length > 0
    ? activities.slice(0, 10).map((a: any) => ({
        id: a.id, name: a.name, type: a.type,
        day: new Date(a.start_date).toLocaleDateString('en-US', { weekday: 'short' }),
        date: a.start_date?.split('T')[0],
        duration: `${Math.floor(a.moving_time / 60)} min`,
        distance: a.distance ? a.distance / 1000 : null,
        pace: null, hr: null,
        description: 'Connect Claude API for AI-powered activity analysis.',
      }))
    : DUMMY_WORKOUTS

  const runKm = workouts.filter(w => w.type === 'Run').reduce((s, w) => s + (w.distance || 0), 0).toFixed(1)
  const swimKm = workouts.filter(w => w.type === 'Swim').reduce((s, w) => s + (w.distance || 0), 0).toFixed(1)
  const rideKm = workouts.filter(w => w.type === 'Ride').reduce((s, w) => s + (w.distance || 0), 0).toFixed(1)

  const allComponents = courseComponents.flatMap(c =>
    c.components.map(comp => ({ ...comp, course: c.name, code: c.code, courseId: c.id }))
  ).sort((a, b) => {
    if (!a.date) return 1
    if (!b.date) return -1
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  const sendMessage = async () => {
    const val = inputRef.current?.value?.trim()
    if (!val) return
    const userMessage = val
    if (inputRef.current) inputRef.current.value = ''
    setMessages(m => [...m, { role: 'user', text: userMessage }])
    setTyping(true)
    try {
      const trainingContext = activities.length > 0
        ? activities.slice(0, 7).map((a: any) =>
            `${new Date(a.start_date).toLocaleDateString('en-US', { weekday: 'short' })}: ${a.name} (${a.type}) - ${Math.floor(a.moving_time/60)} min - ${(a.distance/1000).toFixed(1)}km`
          ).join('\n')
        : workouts.slice(0, 5).map(w =>
            `${w.day}: ${w.name} - ${w.duration}${w.distance ? ` - ${typeof w.distance === 'number' ? w.distance.toFixed(1) : w.distance}km` : ''}`
          ).join('\n')
      const academicContext = allComponents.slice(0, 5).map(c =>
        `${c.type}: ${c.label} (${c.course}) - ${c.date ? `due in ${daysUntil(c.date)} days` : 'no date set'} - weight: ${c.weight}%`
      ).join('\n')
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

  const updateDate = (courseId: number, compLabel: string, date: string) => {
    setCourseComponents(prev => prev.map(c =>
      c.id === courseId ? {
        ...c,
        components: c.components.map(comp =>
          comp.label === compLabel ? { ...comp, date } : comp
        )
      } : c
    ))
    setEditingDate(null)
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

  const renderDashboard = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 pt-7 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p style={{ color: '#444' }} className="text-xs uppercase tracking-widest mb-1">{today}</p>
            <h1 className="text-xl font-medium text-white">{getGreeting()}, {userName}</h1>
          </div>
          {accessToken && (
            <span style={{ color: '#F5C518', borderColor: '#2a2200' }} className="text-xs border px-3 py-1 rounded-full">● Strava live</span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Run', value: runKm + ' km' },
            { label: 'Swim', value: swimKm + ' km' },
            { label: 'Cycle', value: rideKm + ' km' },
            { label: 'Adherence', value: '84%' },
          ].map((card, i) => (
            <div key={i} style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-xl p-4">
              <p style={{ color: '#555' }} className="text-xs mb-2">{card.label}</p>
              <p className="text-2xl font-medium text-white">{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-8 mb-3" style={{ height: '240px' }}>
        <div style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-xl p-5 flex flex-col overflow-hidden">
          <p style={{ color: '#444' }} className="text-xs uppercase tracking-widest mb-3 shrink-0">This week</p>
          <div className="overflow-y-auto flex-1">
            {PLANNED_WORKOUTS.map((w, i) => (
              <div key={i} style={{ borderColor: '#1a1a1a' }} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <p style={{ color: '#2a2a2a' }} className="text-xs w-6 shrink-0">{w.day}</p>
                  <div>
                    <p className="text-white text-sm">{w.name}</p>
                    {w.duration && <p style={{ color: '#444' }} className="text-xs">{w.duration}{w.distance ? ` · ${w.distance}` : ''}</p>}
                  </div>
                </div>
                <span style={{ color: w.type === 'Run' ? '#4ade80' : w.type === 'Ride' ? '#F5C518' : w.type === 'Swim' ? '#60a5fa' : '#222' }} className="text-xs shrink-0">
                  {w.type !== 'Rest' ? w.type : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-xl p-5 flex flex-col overflow-hidden">
          <p style={{ color: '#444' }} className="text-xs uppercase tracking-widest mb-3 shrink-0">Graded components</p>
          <div className="overflow-y-auto flex-1">
            {allComponents.map((comp, i) => {
              const days = daysUntil(comp.date)
              return (
                <div key={i} style={{ borderColor: '#1a1a1a' }} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span style={{ color: typeColor(comp.type), background: '#111', minWidth: 68 }} className="text-xs px-1.5 py-0.5 rounded text-center shrink-0">{comp.type}</span>
                    <div>
                      <p className="text-white text-sm">{comp.label}</p>
                      <p style={{ color: '#444' }} className="text-xs">{comp.code} · {comp.weight}%</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    {comp.date ? (
                      <p style={{ color: days !== null && days <= 3 ? '#ff4444' : days !== null && days <= 7 ? '#F5C518' : '#555' }} className="text-xs">
                        {days !== null && days >= 0 ? `${days}d` : 'past'}
                      </p>
                    ) : (
                      <button onClick={() => setEditingDate(`${comp.courseId}-${comp.label}`)}
                        style={{ color: '#333', borderColor: '#222' }}
                        className="text-xs border px-2 py-0.5 rounded hover:text-white transition">
                        + date
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="px-8 pb-5 shrink-0">
        <div style={{ borderColor: '#2a2a2a', background: '#0d0d0d' }} className="border rounded-xl p-4">
          <div className="overflow-y-auto mb-3 space-y-3" style={{ height: '160px' }}>
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p style={{ color: '#333' }} className="text-sm">Ask anything about your training or schedule</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div style={{
                  background: m.role === 'user' ? '#1c1c1c' : '#161616',
                  color: m.role === 'user' ? '#fff' : '#ccc',
                  borderColor: '#2a2a2a', maxWidth: '75%'
                }} className="border text-sm px-4 py-3 rounded-2xl leading-relaxed">
                  {m.role === 'ai' && <span style={{ color: '#F5C518' }} className="text-xs font-semibold mr-2">AI</span>}
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div style={{ background: '#161616', borderColor: '#2a2a2a', color: '#555' }} className="border text-sm px-4 py-3 rounded-2xl">
                  <span style={{ color: '#F5C518' }} className="text-xs font-semibold mr-2">AI</span>thinking...
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <input
              ref={inputRef}
              placeholder="Ask about your week..."
              style={{ borderColor: '#2a2a2a', background: '#111', color: '#fff' }}
              className="flex-1 border rounded-xl px-4 py-3 text-sm placeholder-[#333] focus:outline-none focus:border-[#F5C518] transition"
              onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
            />
            <button onClick={sendMessage}
              style={{ background: '#F5C518', color: '#080808' }}
              className="font-semibold text-sm px-6 py-3 rounded-xl hover:opacity-80 transition shrink-0">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderTraining = () => (
    <div className="flex-1 overflow-y-auto px-8 py-8">
      <p style={{ color: '#444' }} className="text-xs uppercase tracking-widest mb-1">Training</p>
      <h1 className="text-xl font-medium text-white mb-8">Recent activities</h1>
      {selectedActivity ? (
        <div>
          <button onClick={() => setSelectedActivity(null)} style={{ color: '#444' }} className="text-xs mb-6 hover:text-white transition block">← Back</button>
          <div style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p style={{ color: '#444' }} className="text-xs mb-1">{selectedActivity.date} · {selectedActivity.type}</p>
                <h2 className="text-white text-lg font-medium">{selectedActivity.name}</h2>
              </div>
              <span style={{ color: '#F5C518' }} className="text-sm font-medium">
                {selectedActivity.distance ? `${typeof selectedActivity.distance === 'number' ? selectedActivity.distance.toFixed(1) : selectedActivity.distance} km` : ''}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Duration', value: selectedActivity.duration },
                { label: 'Pace / Speed', value: selectedActivity.pace || '—' },
                { label: 'Heart rate', value: selectedActivity.hr || '—' },
              ].map((s, i) => (
                <div key={i} style={{ background: '#161616' }} className="rounded-lg p-3">
                  <p style={{ color: '#444' }} className="text-xs mb-1">{s.label}</p>
                  <p className="text-white text-sm font-medium">{s.value}</p>
                </div>
              ))}
            </div>
            <div style={{ borderColor: '#1f1f1f' }} className="border-t pt-5">
              <p style={{ color: '#444' }} className="text-xs uppercase tracking-widest mb-3">AI Analysis</p>
              <p style={{ color: '#888' }} className="text-sm leading-relaxed">{selectedActivity.description}</p>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {workouts.map((w: any) => (
            <div key={w.id} onClick={() => setSelectedActivity(w)}
              style={{ borderColor: '#1a1a1a' }}
              className="flex items-center justify-between py-4 border-b last:border-0 cursor-pointer hover:opacity-70 transition">
              <div>
                <p className="text-white text-sm">{w.name}</p>
                <p style={{ color: '#444' }} className="text-xs mt-0.5">{w.date} · {w.type} · {w.duration}</p>
              </div>
              <div className="flex items-center gap-4">
                {w.distance && <p className="text-white text-sm">{typeof w.distance === 'number' ? w.distance.toFixed(1) : w.distance} km</p>}
                <span style={{ color: '#2a2a2a' }} className="text-xs">→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderCourses = () => (
    <div className="flex-1 overflow-y-auto px-8 py-8">
      <p style={{ color: '#444' }} className="text-xs uppercase tracking-widest mb-1">Academic</p>
      <h1 className="text-xl font-medium text-white mb-8">Upcoming components</h1>
      <div>
        {allComponents.map((comp, i) => {
          const days = daysUntil(comp.date)
          const editKey = `${comp.courseId}-${comp.label}`
          return (
            <div key={i} style={{ borderColor: '#1a1a1a' }} className="flex items-center justify-between py-4 border-b last:border-0">
              <div className="flex items-center gap-4">
                <span style={{ color: typeColor(comp.type), background: '#111', minWidth: 80 }} className="text-xs px-2 py-1 rounded text-center">{comp.type}</span>
                <div>
                  <p className="text-white text-sm">{comp.label}</p>
                  <p style={{ color: '#444' }} className="text-xs mt-0.5">{comp.course} · {comp.weight}%</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                {editingDate === editKey ? (
                  <input type="date" autoFocus
                    style={{ background: '#111', borderColor: '#F5C518', color: '#fff' }}
                    className="border rounded px-2 py-1 text-xs focus:outline-none"
                    onBlur={e => updateDate(comp.courseId, comp.label, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && updateDate(comp.courseId, comp.label, (e.target as HTMLInputElement).value)}
                  />
                ) : comp.date ? (
                  <div className="cursor-pointer" onClick={() => setEditingDate(editKey)}>
                    <p style={{ color: days !== null && days <= 3 ? '#ff4444' : days !== null && days <= 7 ? '#F5C518' : '#666' }} className="text-sm">
                      {days !== null && days >= 0 ? `${days}d` : 'past'}
                    </p>
                    <p style={{ color: '#333' }} className="text-xs">{comp.date}</p>
                  </div>
                ) : (
                  <button onClick={() => setEditingDate(editKey)}
                    style={{ color: '#333', borderColor: '#222' }}
                    className="text-xs border px-2 py-1 rounded hover:text-white hover:border-[#F5C518] transition">
                    + add date
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderSettings = () => (
    <div className="flex-1 overflow-y-auto px-8 py-8">
      <p style={{ color: '#444' }} className="text-xs uppercase tracking-widest mb-1">Account</p>
      <h1 className="text-xl font-medium text-white mb-8">Settings</h1>

      <p style={{ color: '#333' }} className="text-xs uppercase tracking-widest mb-3">Integrations</p>
      <div style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-xl p-5 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Strava</p>
            <p style={{ color: accessToken ? '#F5C518' : '#444' }} className="text-xs mt-0.5">
              {accessToken ? `● ${activities.length} activities synced` : '○ Not connected'}
            </p>
          </div>
          {accessToken ? (
            <button onClick={handleStravaDisconnect}
              style={{ borderColor: '#2a0000', color: '#ff4444' }}
              className="text-xs border px-3 py-1.5 rounded-lg hover:bg-[#1a0000] transition">
              Disconnect
            </button>
          ) : (
            <button onClick={handleStravaConnect}
              style={{ borderColor: '#2a2200', color: '#F5C518' }}
              className="text-xs border px-3 py-1.5 rounded-lg hover:bg-[#1a1400] transition">
              Connect Strava
            </button>
          )}
        </div>
      </div>

      <p style={{ color: '#333' }} className="text-xs uppercase tracking-widest mb-3">Profile</p>
      <div style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }} className="border rounded-xl overflow-hidden mb-6">
        {profile && [
          { label: 'Sport', value: profile.sports || '—' },
          { label: 'Fitness level', value: profile.fitness_level || '—' },
          { label: 'Goal', value: profile.goal_time || '—' },
          { label: 'Weekly target', value: profile.weekly_hours ? `${profile.weekly_hours} hrs` : '—' },
          { label: 'Event in', value: profile.months_to_event ? `${profile.months_to_event} months` : '—' },
          { label: 'Courses', value: profile.num_courses ? String(profile.num_courses) : '—' },
        ].map((item, i) => (
          <div key={i} style={{ borderColor: '#1a1a1a' }} className="flex items-center justify-between px-5 py-3.5 border-b last:border-0">
            <p style={{ color: '#444' }} className="text-sm">{item.label}</p>
            <p className="text-white text-sm capitalize">{item.value}</p>
          </div>
        ))}
      </div>

      <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}
        style={{ borderColor: '#1f1f1f', color: '#444' }}
        className="text-xs border px-4 py-2 rounded-lg hover:text-red-400 hover:border-red-900 transition">
        Sign out
      </button>
    </div>
  )

  const renderView = () => {
    switch (activeNav) {
      case 'dashboard': return renderDashboard()
      case 'plan': return <PlanView allComponents={allComponents} activities={activities} daysUntil={daysUntil} />
      case 'training': return renderTraining()
      case 'courses': return renderCourses()
      case 'settings': return renderSettings()
      default: return renderDashboard()
    }
  }

  return (
    <div style={{ background: '#080808' }} className="flex h-screen text-white overflow-hidden">
      <aside style={{ borderColor: '#161616', background: '#080808' }} className="w-44 border-r flex flex-col py-6 px-3 shrink-0">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div style={{ background: '#F5C518' }} className="w-5 h-5 rounded flex items-center justify-center">
            <span style={{ color: '#080808' }} className="text-xs font-black">A</span>
          </div>
          <span className="text-white text-sm font-medium">Athlete OS</span>
        </div>
        <nav className="flex-1 space-y-0.5">
          {NAV.map(item => (
            <button key={item.id} onClick={() => setActiveNav(item.id)}
              style={{
                background: activeNav === item.id ? '#141400' : 'transparent',
                color: activeNav === item.id ? '#F5C518' : '#555',
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm transition hover:text-white">
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-3 pt-4" style={{ borderTopWidth: 1, borderColor: '#161616' }}>
          <p style={{ color: '#333' }} className="text-xs truncate mb-1">{userName}</p>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}
            style={{ color: '#333' }} className="text-xs hover:text-red-400 transition">
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {renderView()}
        <div className="pb-2 shrink-0 text-center">
          <p style={{ color: '#F5C518', opacity: 0.2 }} className="text-xs tracking-widest uppercase">
            Powered by Umar Farooq — Pakistan's Fastest Olympic Distance Triathlete
          </p>
        </div>
      </main>
    </div>
  )
}