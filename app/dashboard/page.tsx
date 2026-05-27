'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'training', label: 'Training', icon: '⚡' },
  { id: 'progress', label: 'Progress', icon: '📈' },
]
const NAV_ACADEMIC = [
  { id: 'courses', label: 'Courses', icon: '📚' },
  { id: 'schedule', label: 'Schedule', icon: '📅' },
]
const NAV_INTEGRATIONS = [
  { id: 'strava', label: 'Strava', icon: '🔗' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

const DUMMY_COURSES = [
  { id: 1, name: 'Exercise Physiology', code: 'EP301', assessment: 'Lab report due May 29', daysLeft: 2, color: 'bg-purple-500' },
  { id: 2, name: 'Sports Nutrition', code: 'SN201', assessment: 'Quiz on Jun 3', daysLeft: 7, color: 'bg-blue-500' },
  { id: 3, name: 'Biomechanics', code: 'BM401', assessment: 'Assignment due Jun 10', daysLeft: 14, color: 'bg-green-500' },
]

const DUMMY_WORKOUTS = [
  { id: 1, name: 'Easy run', type: 'Run', day: 'Mon', duration: '45 min', distance: '8.2 km', zone: 'Zone 2' },
  { id: 2, name: 'Strength session', type: 'Strength', day: 'Tue', duration: '60 min', distance: null, zone: null },
  { id: 3, name: 'Tempo ride', type: 'Ride', day: 'Wed', duration: '90 min', distance: '35 km', zone: 'Zone 3' },
  { id: 4, name: 'Rest day', type: 'Rest', day: 'Thu', duration: null, distance: null, zone: null },
  { id: 5, name: 'Long run', type: 'Run', day: 'Fri', duration: '75 min', distance: '14 km', zone: 'Zone 2' },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    Run: 'bg-green-500', Ride: 'bg-orange-500',
    Swim: 'bg-blue-500', Strength: 'bg-purple-500', Rest: 'bg-gray-700',
  }
  return colors[type] || 'bg-gray-600'
}

export default function Dashboard() {
  const router = useRouter()
  const [activeNav, setActiveNav] = useState('dashboard')
  const [profile, setProfile] = useState<any>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [dbCourses, setDbCourses] = useState<any[]>([])
  const [messages, setMessages] = useState([
    { role: 'ai', text: "I've analyzed your schedule. Lab report due in 2 days — keep today's session easy." }
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [userName, setUserName] = useState('Athlete')

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
    fetch(`/api/strava?access_token=${accessToken}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setActivities(data) })
  }, [accessToken])

  const weeklyKm = activities.length > 0
    ? activities.slice(0, 5).reduce((sum, a) => sum + (a.distance || 0) / 1000, 0).toFixed(1)
    : '42.3'

  const workouts = activities.length > 0
    ? activities.slice(0, 5).map((a: any) => ({
        id: a.id, name: a.name, type: a.type,
        day: new Date(a.start_date).toLocaleDateString('en-US', { weekday: 'short' }),
        duration: `${Math.floor(a.moving_time / 60)} min`,
        distance: a.distance ? `${(a.distance / 1000).toFixed(1)} km` : null,
        zone: null,
      }))
    : DUMMY_WORKOUTS

  const displayCourses = dbCourses.length > 0 ? dbCourses.map((c, i) => ({
    id: c.id, name: c.name, code: c.code,
    assessment: `Quizzes: ${c.num_quizzes} · Mid: ${c.mid_weight}% · Final: ${c.final_weight}%`,
    daysLeft: 30 - i * 7,
    color: ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500'][i % 5],
  })) : DUMMY_COURSES

  const DUMMY_RESPONSES = [
    "You have a lab report in 2 days. Keep tomorrow's session under 45 minutes.",
    "Your weekly km is on track. Focus on quality over quantity this week.",
    "Exam pressure is high. Consider replacing your long run with a recovery swim.",
    "Good balance this week. You can maintain your current training volume.",
    "Based on your Strava data, your running pace has improved 8% this month.",
  ]

  const sendMessage = () => {
    if (!input.trim()) return
    setMessages(m => [...m, { role: 'user', text: input }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      const reply = DUMMY_RESPONSES[Math.floor(Math.random() * DUMMY_RESPONSES.length)]
      setMessages(m => [...m, { role: 'ai', text: reply }])
      setTyping(false)
    }, 1200)
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* Sidebar */}
      <aside className="w-56 border-r border-gray-900 flex flex-col py-6 px-4 shrink-0">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
            <span className="text-black text-xs font-black">A</span>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">Athlete OS</span>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV.map(item => (
            <button key={item.id} onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${activeNav === item.id ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'}`}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}

          <p className="text-gray-700 text-xs uppercase tracking-widest px-3 pt-4 pb-1">Academic</p>
          {NAV_ACADEMIC.map(item => (
            <button key={item.id} onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${activeNav === item.id ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'}`}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}

          <p className="text-gray-700 text-xs uppercase tracking-widest px-3 pt-4 pb-1">Integrations</p>
          {NAV_INTEGRATIONS.map(item => (
            <button key={item.id} onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${activeNav === item.id ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'}`}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <div className="px-2 pt-4 border-t border-gray-900">
          <p className="text-gray-600 text-xs truncate">{userName}</p>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}
            className="text-gray-600 text-xs hover:text-gray-400 transition mt-1">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top */}
        <div className="px-8 pt-8 pb-4 shrink-0">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold">{getGreeting()}, {userName} 👋</h1>
              <p className="text-gray-500 text-sm mt-1">Here's your day at a glance. You're on track.</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2">
              <p className="text-gray-400 text-sm">{today}</p>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Weekly km', value: weeklyKm, sub: `Goal: ${profile?.weekly_hours || 50} km`, color: 'text-green-400' },
              { label: 'Training days left', value: '3', sub: 'This week', color: 'text-blue-400' },
              { label: 'Assignments due', value: String(displayCourses.length), sub: 'This week', color: 'text-red-400' },
              { label: 'Plan adherence', value: '84%', sub: 'Last 30 days', color: 'text-orange-400' },
            ].map((card, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <p className="text-gray-500 text-xs mb-3">{card.label}</p>
                <p className="text-3xl font-semibold text-white">{card.value}</p>
                <p className={`${card.color} text-xs mt-2`}>● {card.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Panels */}
        <div className="flex-1 grid grid-cols-2 gap-4 px-8 py-4 overflow-hidden">

          {/* Training */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="text-white font-medium text-sm">Training this week</h2>
              {accessToken && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">● Strava</span>}
            </div>
            <div className="space-y-2 overflow-y-auto flex-1">
              {workouts.map((w: any) => (
                <div key={w.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800 transition cursor-pointer">
                  <div className={`w-8 h-8 rounded-lg ${getTypeColor(w.type)} flex items-center justify-center shrink-0`}>
                    <span className="text-white text-xs font-bold">{w.type[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{w.name}</p>
                    <p className="text-gray-500 text-xs">{w.day}{w.duration ? ` · ${w.duration}` : ''}{w.zone ? ` · ${w.zone}` : ''}</p>
                  </div>
                  {w.distance && <span className="text-gray-400 text-sm shrink-0">{w.distance}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Courses */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="text-white font-medium text-sm">Courses</h2>
              <button className="text-gray-500 text-xs hover:text-gray-300 transition">View all →</button>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1">
              {displayCourses.map((course: any) => (
                <div key={course.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-800 transition cursor-pointer">
                  <div className={`w-1 min-h-12 rounded-full ${course.color} shrink-0`} />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{course.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{course.assessment}</p>
                    <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full ${course.daysLeft <= 3 ? 'bg-red-950 text-red-400' : course.daysLeft <= 7 ? 'bg-yellow-950 text-yellow-400' : 'bg-gray-800 text-gray-400'}`}>
                      {course.daysLeft} days left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Chat */}
        <div className="px-8 pb-4 shrink-0">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="h-24 overflow-y-auto mb-3 space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`text-xs px-3 py-2 rounded-xl max-w-lg ${m.role === 'user' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300'}`}>
                    {m.role === 'ai' && <span className="text-gray-600 mr-1">AI ·</span>}
                    {m.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="text-xs px-3 py-2 rounded-xl bg-gray-800 text-gray-500">thinking...</div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Write a message..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600" />
              <button onClick={sendMessage}
                className="bg-white text-black text-sm font-semibold px-5 rounded-xl hover:bg-gray-200 transition">
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pb-3 shrink-0 text-center">
          <p className="text-gray-800 text-xs tracking-widest uppercase">
            Powered by Umar Farooq — Pakistan's Fastest Olympic Distance Triathlete
          </p>
        </div>

      </main>
    </div>
  )
}