import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
    }),
  })

  const data = await response.json()

  if (data.access_token) {
  const redirectUrl = new URL('/dashboard', request.url)
    redirectUrl.searchParams.set('access_token', data.access_token)
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.json({ error: 'Authentication failed' }, { status: 400 })
}