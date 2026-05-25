'use client'
import { useEffect, useState } from 'react'

const DUMMY_ACADEMIC = [
  { id: 1, title: 'CS301 Quiz 1', type: 'Quiz', course: 'CS301', date: '2025-05-28', weight: 10 },
  { id: 2, title: 'Calculus Assignment', type: 'Assignment', course: 'MATH201', date: '2025-05-30', weight: 15 },
  { id: 3, title: 'Physics Midterm', type: 'Mid', course: 'PHY101', date: '2025-06-04', weight: 30 },
  { id: 4, title: 'CS301 Assignment 2', type: 'Assignment', course: 'CS301', date: '2025-06-07', weight: 10 },
  { id: 5, title: 'MATH201 Quiz 2', type: 'Quiz', course: 'MATH201', date: '2025-06-10', weight: 10 },
  { id: 6, title: 'CS301 Midterm', type: 'Mid', course: 'CS301', date: '2025-06-15', weight: 30 },
]

const DUMMY_WORKOUTS = [
  { id: 1, name: 'Morning Run', type: 'Run', date: '2025-05-25', distance: 10.2, duration: 52 },
  { id: 2, name: 'Swim Session', type: 'Swim', date: '2025-05-26', distance: 2.0, duration: 45 },
  { id: 3, name: 'Bike Ride', type: 'Ride', date: '2025-05-27', distance: 35.0, duration: 90 },
  { id: 4, name: 'Tempo Run', type: 'Run', date: '2025-05-29', distance: 8.0, duration: 38 },
  { id: 5, name: 'Long Ride', type: 'Ride', date: '2025-06-01', distance: 60.0, duration: 150 },
  { id: 6, name: 'Recovery Swim', type: 'Swim', date: '2025-06-03', distance: 1.5, duration: 35 },
]

const DUMMY_CHAT = [
  { role: 'ai', text: "Welcome Umar. I've analyzed your schedule. You have a Physics Midterm on June 4 — I recommend reducing training volume by 20% from June 1-4." },
]

type Event = { id: number; title?: string; name?: string; type: string; date: string; [key: string]: any }
type Message = { role: string; text: string }

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDay(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function Calendar({
  title,
  events,
  color,
  onEventClick,
}: {
  title: string
  events: Event[]
  color: string
  onEventClick: (e: Event) => void
}) {
  const today = new Date()
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() })

  const daysInMonth = getDaysInMonth(current.year, current.month)
  const firstDay = getFirstDay(current.year, current.month)
  const monthName = new Date(current.year, current.month).toLocaleString('default', { month: 'long' })

  const eventsThisMonth = events.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === current.month && d.getFullYear() === current.year
  })

  const getEventsOnDay = (day: number) =>
    eventsThisMonth.filter(e => new Date(e.date).getDate() === day)

  const prev = () => {
    setCurrent(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 })
  }
  const next = () => {
    setCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 })
  }

  const typeColor: Record<string, string> = {
    Quiz: 'bg-yellow-500',
    Assignment: 'bg-blue-500',
    Mid: 'bg-red-500',
    Final: 'bg-purple-500',
    Run: 'bg-green-500',
    Swim: 'bg-cyan-500',
    Ride: 'bg-orange-500',
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-sm tracking-widest uppercase">{title}</h2>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="text-gray-500 hover:text-white transition text-lg px-1">‹</button>
          <span className="text-gray-300 text-sm">{monthName} {current.year}</span>
          <button onClick={next} className="text-gray-500 hover:text-white transition text-lg px-1">›</button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-gray-600 text-xs py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 flex-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dayEvents = getEventsOnDay(day)
          const isToday = day === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear()
          return (
            <div
              key={day}
              className={`relative flex flex-col items-center py-1 rounded-lg cursor-pointer transition hover:bg-gray-800 ${isToday ? 'bg-gray-800 ring-1 ring-gray-600' : ''}`}
              onClick={() => dayEvents[0] && onEventClick(dayEvents[0])}
            >
              <span className={`text-xs ${isToday ? 'text-white font-bold' : 'text-gray-400'}`}>{day}</span>
              <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                {dayEvents.slice(0, 2).map(e => (
                  <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${typeColor[e.type] || 'bg-gray-500'}`} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Upcoming list */}
      <div className="mt-4 border-t border-gray-800 pt-4 space-y-2">
        {eventsThisMonth.slice(0, 3).map(e => (
          <div
            key={e.id}
            onClick={() => onEventClick(e)}
            className="flex items-center justify-between cursor-pointer hover:bg-gray-800 rounded-lg px-2 py-1.5 transition"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${typeColor[e.type] || 'bg-gray-500'}`} />
              <span className="text-gray-300 text-xs">{e.title || e.name}</span>
            </div>
            <span className="text-gray-600 text-xs">{new Date(e.date).toLocaleDateString('default', { month: 'short', day: 'numeric' })}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [messages, setMessages] = useState<Message[]>(DUMMY_CHAT)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('access_token')
    if (token) {
      setAccessToken(token)
      localStorage.setItem('strava_token', token)
      window.history.replaceState({}, '', '/')
    } else {
      const saved = localStorage.getItem('strava_token')
      if (saved) setAccessToken(saved)
    }
  }, [])

  useEffect(() => {
    if (!accessToken) return
    fetch(`/api/strava?access_token=${accessToken}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setActivities(data)
      })
  }, [accessToken])

  const workouts: Event[] = accessToken && activities.length > 0
    ? activities.map((a: any) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        date: a.start_date?.split('T')[0],
        distance: (a.distance / 1000).toFixed(1),
        duration: Math.floor(a.moving_time / 60),
      }))
    : DUMMY_WORKOUTS

  const handleStravaLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
    window.location.href = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=http://localhost:3000/api/auth/callback&response_type=code&scope=activity:read_all`
  }

  const DUMMY_RESPONSES = [
    "Based on your schedule, you have a heavy week ahead. I recommend cutting Tuesday's run by 30%.",
    "Your Physics Midterm is 4 days away. Consider replacing your long ride with a recovery swim.",
    "Load score is high this week. Prioritize sleep over extra training sessions.",
    "Good balance this week. You can maintain your current training volume.",
    "Quiz on Thursday detected. Keep Wednesday's session light — 30 min easy run max.",
  ]

  const sendMessage = () => {
    if (!input.trim()) return
    const userMsg = { role: 'user', text: input }
    setMessages(m => [...m, userMsg])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      const reply = DUMMY_RESPONSES[Math.floor(Math.random() * DUMMY_RESPONSES.length)]
      setMessages(m => [...m, { role: 'ai', text: reply }])
      setTyping(false)
    }, 1200)
  }

  const recoveryScore = 78
  const weeklyKm = workouts.slice(0, 4).reduce((sum, w) => sum + parseFloat(String(w.distance || 0)), 0).toFixed(1)
  const daysToNextExam = Math.max(0, Math.ceil((new Date(DUMMY_ACADEMIC[2].date).getTime() - Date.now()) / 86400000))

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col" style={{ fontFamily: "'SF Pro Display', -apple-system, sans-serif" }}>

      {/* Top Bar */}
      <header className="border-b border-gray-900 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
            <span className="text-black text-xs font-black">A</span>
          </div>
          <span className="text-white font-semibold tracking-tight">Athlete OS</span>
        </div>
        <div className="flex items-center gap-4">
          {!accessToken ? (
            <button
              onClick={handleStravaLogin}
              className="text-xs border border-orange-500 text-orange-400 px-4 py-1.5 rounded-full hover:bg-orange-500 hover:text-white transition"
            >
              Connect Strava
            </button>
          ) : (
            <span className="text-xs text-green-400 border border-green-800 px-3 py-1 rounded-full">● Strava Live</span>
          )}
          <span className="text-gray-600 text-xs">Umar Farooq</span>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-[1fr_220px_1fr] gap-4 p-6 min-h-0">

        {/* Left — Academic Calendar */}
        <Calendar
          title="Academic"
          events={DUMMY_ACADEMIC}
          color="blue"
          onEventClick={setSelectedEvent}
        />

        {/* Center — Stats */}
        <div className="flex flex-col gap-3">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 flex flex-col items-center justify-center text-center">
            <p className="text-gray-600 text-xs uppercase tracking-widest mb-1">Recovery</p>
            <p className={`text-4xl font-bold ${recoveryScore >= 80 ? 'text-green-400' : recoveryScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
              {recoveryScore}%
            </p>
          </div>

          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 flex flex-col items-center justify-center text-center">
            <p className="text-gray-600 text-xs uppercase tracking-widest mb-1">Weekly km</p>
            <p className="text-4xl font-bold text-blue-400">{weeklyKm}</p>
          </div>

          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 flex flex-col items-center justify-center text-center">
            <p className="text-gray-600 text-xs uppercase tracking-widest mb-1">Next Exam</p>
            <p className="text-4xl font-bold text-orange-400">{daysToNextExam}d</p>
          </div>

          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 flex flex-col items-center justify-center text-center flex-1">
            <p className="text-gray-600 text-xs uppercase tracking-widest mb-2">Load</p>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${daysToNextExam < 5 ? 'border-red-500 text-red-400' : 'border-green-500 text-green-400'}`}>
              <span className="text-xs font-bold">{daysToNextExam < 5 ? 'HIGH' : 'OK'}</span>
            </div>
          </div>
        </div>

        {/* Right — Training Calendar */}
        <Calendar
          title="Training"
          events={workouts}
          color="green"
          onEventClick={setSelectedEvent}
        />
      </div>

      {/* AI Chat */}
      <div className="border-t border-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-700 text-xs uppercase tracking-widest mb-3">AI Coach</p>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 h-36 overflow-y-auto mb-3 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`text-xs px-3 py-2 rounded-xl max-w-xs ${m.role === 'user' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300'}`}>
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
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about your week..."
              className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-gray-600"
            />
            <button
              onClick={sendMessage}
              className="bg-white text-black text-sm font-semibold px-5 rounded-xl hover:bg-gray-200 transition"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-3 text-gray-800 text-xs tracking-widest">
        POWERED BY UMAR FAROOQ — PAKISTAN'S FASTEST OLYMPIC TRIATHLETE
      </div>

      {/* Event Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" onClick={() => setSelectedEvent(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-80" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-white font-semibold">{selectedEvent.title || selectedEvent.name}</h3>
              <button onClick={() => setSelectedEvent(null)} className="text-gray-600 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="text-gray-300">{selectedEvent.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="text-gray-300">{new Date(selectedEvent.date).toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
              {selectedEvent.distance && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Distance</span>
                  <span className="text-gray-300">{selectedEvent.distance} km</span>
                </div>
              )}
              {selectedEvent.duration && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration</span>
                  <span className="text-gray-300">{selectedEvent.duration} min</span>
                </div>
              )}
              {selectedEvent.weight && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Weight</span>
                  <span className="text-gray-300">{selectedEvent.weight}%</span>
                </div>
              )}
              {selectedEvent.course && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Course</span>
                  <span className="text-gray-300">{selectedEvent.course}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  )
}