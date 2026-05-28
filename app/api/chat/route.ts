import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json()

    const isPlanning = message.includes('Generate a 7-day training plan')

    const systemPrompt = isPlanning
      ? `You are a training plan generator. You must respond with ONLY a valid JSON array. No text before or after. No markdown. No backticks. Just the raw JSON array starting with [ and ending with ].`
      : `You are an AI coach for a student-athlete named Umar Farooq, Pakistan's fastest Olympic distance triathlete.

Training data from Strava:
${context.training}

Upcoming academic deadlines:
${context.academic}

Keep responses to 2-3 sentences. Be direct and actionable.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    })

    let text = response.content[0].type === 'text' ? response.content[0].text : ''

    if (isPlanning) {
      const match = text.match(/\[[\s\S]*\]/)
      if (match) text = match[0]
    }

    return NextResponse.json({ message: text })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ message: 'Something went wrong. Try again.' }, { status: 500 })
  }
}