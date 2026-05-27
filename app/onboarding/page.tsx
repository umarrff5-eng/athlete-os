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

type Course = {
  name: string
  code: string
  quizzes: string
  quizWeight: string
  assignments: string
  assignWeight: string
  midWeight: string
  finalWeight: string
}

const emptyCourse = (): Course => ({
  name: '', code: '',
  quizzes: '', quizWeight: '',
  assignments: '', assignWeight: '',
  midWeight: '', finalWeight: '',
})

export default function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1
  const [sports, setSports] = useState<string[]>([])
  const [distances, setDistances] = useState<Record<string, string>>({})
  const [goalTime, setGoalTime] = useState('')
  const [fitnessLevel, setFitnessLevel] = useState('')
  const [monthsToEvent, setMonthsToEvent] = useState('6')
  const [weeklyHours, setWeeklyHours] = useState('8')

  // Step 2
  const [numCourses, setNumCourses] = useState('')
  const [semesterStart, setSemesterStart] = useState('')
  const [semesterEnd, setSemesterEnd] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [currentCourseIdx, setCurrentCourseIdx] = useState(0)
  const [academicStep, setAcademicStep] = useState<'info' | 'courses'>('info')

  // Step 3
  const [connectStrava, setConnectStrava] = useState(false)

  const toggleSport = (sport: string) => {
    setSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    )
  }

  const setDistance = (sport: string, distance: string) => {
    setDistances(prev => ({ ...prev, [sport]: distance }))
  }

  const step1Valid = sports.length > 0 && fitnessLevel !== '' &&
    sports.every(s => distances[s])

  const initCourses = () => {
    const n = parseInt(numCourses)
    if (!n || n < 1) return
    setCourses(Array.from({ length: n }, emptyCourse))
    setCurrentCourseIdx(0)
    setAcademicStep('courses')
  }

  const updateCourse = (field: keyof Course, value: string) => {
    setCourses(prev => prev.map((c, i) =>
      i === currentCourseIdx ? { ...c, [field]: value } : c
    ))
  }

  const currentCourse = courses[currentCourseIdx]

  const courseValid = currentCourse &&
    currentCourse.name && currentCourse.code

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
        num_courses: parseInt(numCourses),
        onboarded: true,
      })

      for (const course of courses) {
        await supabase.from('courses').insert({
          user_id: user.id,
          name: course.name,
          code: course.code,
          num_quizzes: parseInt(course.quizzes) || 0,
          quiz_weight: parseFloat(course.quizWeight) || 0,
          num_assignments: parseInt(course.assignments) || 0,
          assign_weight: parseFloat(course.assignWeight) || 0,
          mid_weight: parseFloat(course.midWeight) || 0,
          final_weight: parseFloat(course.finalWeight) || 0,
        })
      }
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

        {/* Step 1 - Sport */}
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

        {/* Step 2 - Academic */}
        {step === 2 && academicStep === 'info' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Step 2 of 3</p>
            <h2 className="text-white font-semibold text-xl mb-6">Your academic load</h2>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-gray-400 text-sm mb-2">Number of courses this semester</p>
                <input type="number" placeholder="e.g. 5" min="1" max="10"
                  value={numCourses} onChange={e => setNumCourses(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500" />
              </div>

              <div>
                <p className="text-gray-400 text-sm mb-2">Semester start date</p>
                <input type="date"
                  value={semesterStart} onChange={e => setSemesterStart(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
              </div>

              <div>
                <p className="text-gray-400 text-sm mb-2">Semester end date</p>
                <input type="date"
                  value={semesterEnd} onChange={e => setSemesterEnd(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 border border-gray-700 text-gray-400 font-semibold py-3 rounded-xl text-sm hover:border-gray-500 transition">
                ← Back
              </button>
              <button onClick={initCourses} disabled={!numCourses || !semesterStart || !semesterEnd}
                className="flex-1 bg-white text-black font-semibold py-3 rounded-xl text-sm hover:bg-gray-200 transition disabled:opacity-30">
                Add courses →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 - Course Entry */}
        {step === 2 && academicStep === 'courses' && currentCourse && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-1">
              <p className="text-gray-500 text-xs uppercase tracking-widest">Step 2 of 3</p>
              <p className="text-gray-600 text-xs">Course {currentCourseIdx + 1} of {courses.length}</p>
            </div>
            <h2 className="text-white font-semibold text-xl mb-6">Enter course details</h2>

            {/* Course progress dots */}
            <div className="flex gap-1.5 mb-6">
              {courses.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full ${i <= currentCourseIdx ? 'bg-white' : 'bg-gray-700'}`} />
              ))}
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-gray-400 text-sm mb-2">Course name</p>
                  <input type="text" placeholder="e.g. Data Structures"
                    value={currentCourse.name} onChange={e => updateCourse('name', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-2">Course code</p>
                  <input type="text" placeholder="e.g. CS201"
                    value={currentCourse.code} onChange={e => updateCourse('code', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500" />
                </div>
              </div>

              {/* Quizzes */}
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-white text-sm font-medium mb-3">Quizzes</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Number of quizzes</p>
                    <input type="number" placeholder="e.g. 6" min="0"
                      value={currentCourse.quizzes} onChange={e => updateCourse('quizzes', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Total weightage %</p>
                    <input type="number" placeholder="e.g. 15" min="0" max="100"
                      value={currentCourse.quizWeight} onChange={e => updateCourse('quizWeight', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* Assignments */}
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-white text-sm font-medium mb-3">Assignments</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Number of assignments</p>
                    <input type="number" placeholder="e.g. 4" min="0"
                      value={currentCourse.assignments} onChange={e => updateCourse('assignments', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Total weightage %</p>
                    <input type="number" placeholder="e.g. 20" min="0" max="100"
                      value={currentCourse.assignWeight} onChange={e => updateCourse('assignWeight', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* Midterm & Final */}
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-white text-sm font-medium mb-3">Exams</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Midterm weightage %</p>
                    <input type="number" placeholder="e.g. 30" min="0" max="100"
                      value={currentCourse.midWeight} onChange={e => updateCourse('midWeight', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Final weightage %</p>
                    <input type="number" placeholder="e.g. 35" min="0" max="100"
                      value={currentCourse.finalWeight} onChange={e => updateCourse('finalWeight', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => {
                if (currentCourseIdx === 0) setAcademicStep('info')
                else setCurrentCourseIdx(i => i - 1)
              }}
                className="flex-1 border border-gray-700 text-gray-400 font-semibold py-3 rounded-xl text-sm hover:border-gray-500 transition">
                ← Back
              </button>
              {currentCourseIdx < courses.length - 1 ? (
                <button onClick={() => setCurrentCourseIdx(i => i + 1)} disabled={!courseValid}
                  className="flex-1 bg-white text-black font-semibold py-3 rounded-xl text-sm hover:bg-gray-200 transition disabled:opacity-30">
                  Next course →
                </button>
              ) : (
                <button onClick={() => setStep(3)} disabled={!courseValid}
                  className="flex-1 bg-white text-black font-semibold py-3 rounded-xl text-sm hover:bg-gray-200 transition disabled:opacity-30">
                  Continue →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3 - Device */}
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
              <button onClick={() => { setStep(2); setAcademicStep('courses'); setCurrentCourseIdx(courses.length - 1) }}
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