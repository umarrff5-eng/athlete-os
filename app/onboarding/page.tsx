'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const FITNESS_LEVELS = [
  { id: 'beginner', label: 'Complete beginner', desc: 'Just starting out' },
  { id: 'some', label: 'Some base fitness', desc: 'Training occasionally' },
  { id: 'moderate', label: 'Moderately fit', desc: '2-3x per week' },
  { id: 'very', label: 'Very fit', desc: '4-5x per week' },
  { id: 'elite', label: 'Elite', desc: 'Competitive athlete' },
]

const DISTANCES: Record<string, string[]> = {
  Running: ['5K', '10K', 'Half Marathon', 'Marathon', 'Ultra'],
  Swimming: ['1.5km', '5km', '10km', 'Open Water'],
  Cycling: ['50km', '100km', 'Gran Fondo', 'Race'],
  Triathlon: ['Sprint', 'Olympic', '70.3 Half', 'Full Ironman'],
}

const SPORTS = ['Running', 'Swimming', 'Cycling', 'Triathlon']

export default function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [sports, setSports] = useState<string[]>([])
  const [distances, setDistances] = useState<Record<string, string>>({})
  const [goalTime, setGoalTime] = useState('')
  const [fitnessLevel, setFitnessLevel] = useState('')
  const [monthsToEvent, setMonthsToEvent] = useState('6')
  const [weeklyHours, setWeeklyHours] = useState('8')

  const [semesterStart, setSemesterStart] = useState('')
  const [semesterEnd, setSemesterEnd] = useState('')

  const [connectStrava, setConnectStrava] = useState(false)

  const toggleSport = (sport: string) => {
    setSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    )
  }

  const setDistance = (sport: string, distance: string) => {
    setDistances(prev => ({ ...prev, [sport]: distance }))
  }

  const step1Valid = sports.length > 0 && fitnessLevel !== '' && sports.every(s => distances[s])

  const handleFinish = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        sports: sports.join(', '),
        distances: JSON.stringify(distances),
        goal_time: goalTime,
        fitness_level: fitnessLevel,
        months_to_event: parseInt(monthsToEvent),
        weekly_hours: weeklyHours,
        semester_start: semesterStart,
        semester_end: semesterEnd,
        onboarded: true,
      })
    }
    if (connectStrava) {
      const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
      window.location.href = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${window.location.origin}/api/auth/callback&response_type=code&scope=activity:read_all`
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  const progress = (step / 3) * 100

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
            <span className="text-black text-xs font-black">A</span>
          </div>
          <span className="text-white font-semibold tracking-tight">Athlete OS</span>
        </div>

        <div className="w-full bg-gray-800 rounded-full h-1 mb-8">
          <div className="bg-white h-1 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {step === 1 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Step 1 of 3</p>
            <h2 className="text-white font-semibold text-xl mb-2">What are you training for?</h2>
            <p className="text-gray-500 text-sm mb-6">Select all that apply.</p>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {SPORTS.map(s => (
                <button key={s} onClick={() => toggleSport(s)}
                  className={`py-3 px-4 rounded-xl text-sm border transition text-left ${sports.includes(s) ? 'bg-white text-black border-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                  <span className="font-medium">{s}</span>
                </button>
              ))}
            </div>

            {sports.length > 0 && (
              <div className="mb-6 space-y-4">
                {sports.map(sport => (
                  <div key={sport}>
                    <p className="text-gray-400 text-sm mb-2">Target distance — <span className="text-white">{sport}</span></p>
                    <div className="flex flex-wrap gap-2">
                      {DISTANCES[sport].map(d => (
                        <button key={d} onClick={() => setDistance(sport, d)}
                          className={`py-1.5 px-3 rounded-lg text-xs border transition ${distances[sport] === d ? 'bg-white text-black border-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Your goal time <span className="text-gray-600">(optional)</span></p>
              <input type="text" placeholder="e.g. Sub 1:45 half marathon"
                value={goalTime} onChange={e => setGoalTime(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500" />
            </div>

            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-3">Current fitness level</p>
              <div className="space-y-2">
                {FITNESS_LEVELS.map(f => (
                  <button key={f.id} onClick={() => setFitnessLevel(f.id)}
                    className={`w-full flex items-center justify-between py-3 px-4 rounded-xl border transition ${fitnessLevel === f.id ? 'bg-white text-black border-white' : 'border-gray-700 hover:border-gray-500'}`}>
                    <span className={`text-sm font-medium ${fitnessLevel === f.id ? 'text-black' : 'text-gray-300'}`}>{f.label}</span>
                    <span className="text-xs text-gray-500">{f.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Months until your event: <span className="text-white">{monthsToEvent} months</span></p>
              <input type="range" min="1" max="24" value={monthsToEvent}
                onChange={e => setMonthsToEvent(e.target.value)} className="w-full" />
              <div className="flex justify-between text-gray-600 text-xs mt-1">
                <span>1 month</span><span>24 months</span>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-gray-400 text-sm mb-2">Weekly training target: <span className="text-white">{weeklyHours} hours</span></p>
              <input type="range" min="1" max="30" value={weeklyHours}
                onChange={e => setWeeklyHours(e.target.value)} className="w-full" />
              <div className="flex justify-between text-gray-600 text-xs mt-1">
                <span>1 hr</span><span>30 hrs</span>
              </div>
            </div>

            <button onClick={() => setStep(2)} disabled={!step1Valid}
              className="w-full bg-white text-black font-semibold py-3 rounded-xl text-sm hover:bg-gray-200 transition disabled:opacity-30">
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Step 2 of 3</p>
            <h2 className="text-white font-semibold text-xl mb-2">Your semester</h2>
            <p className="text-gray-500 text-sm mb-6">You can add courses and exam dates from the dashboard later.</p>

            <div className="space-y-4 mb-8">
              <div>
                <p className="text-gray-400 text-sm mb-2">Semester start date</p>
                <input type="date" value={semesterStart} onChange={e => setSemesterStart(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">Semester end date</p>
                <input type="date" value={semesterEnd} onChange={e => setSemesterEnd(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 border border-gray-700 text-gray-400 font-semibold py-3 rounded-xl text-sm hover:border-gray-500 transition">
                ← Back
              </button>
              <button onClick={() => setStep(3)}
                className="flex-1 bg-white text-black font-semibold py-3 rounded-xl text-sm hover:bg-gray-200 transition">
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Step 3 of 3</p>
            <h2 className="text-white font-semibold text-xl mb-2">Connect your devices</h2>
            <p className="text-gray-500 text-sm mb-6">We will pull your workout data automatically.</p>

            <div className="space-y-3 mb-8">
              <button onClick={() => setConnectStrava(!connectStrava)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition ${connectStrava ? 'border-orange-500 bg-orange-950' : 'border-gray-700 hover:border-gray-500'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">S</div>
                  <div className="text-left">
                    <p className="text-white text-sm font-medium">Strava</p>
                    <p className="text-gray-500 text-xs">Running, cycling, swimming</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${connectStrava ? 'border-orange-500 bg-orange-500' : 'border-gray-600'}`}>
                  {connectStrava && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>

              <div className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-800 opacity-40">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">G</div>
                  <div className="text-left">
                    <p className="text-white text-sm font-medium">Garmin</p>
                    <p className="text-gray-500 text-xs">Coming soon</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="flex-1 border border-gray-700 text-gray-400 font-semibold py-3 rounded-xl text-sm hover:border-gray-500 transition">
                ← Back
              </button>
              <button onClick={handleFinish} disabled={loading}
                className="flex-1 bg-white text-black font-semibold py-3 rounded-xl text-sm hover:bg-gray-200 transition disabled:opacity-50">
                {loading ? 'Setting up...' : connectStrava ? 'Connect and Go →' : 'Skip and Go →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}