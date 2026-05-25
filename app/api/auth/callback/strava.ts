import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const accessToken = searchParams.get('access_token')

  if (!accessToken) {
    return NextResponse.json({ error: 'No access token' }, { status: 400 })
  }

  const response = await fetch(
    'https://www.strava.com/api/v3/athlete/activities?per_page=10',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  const activities = await response.json()
  return NextResponse.json(activities)
}