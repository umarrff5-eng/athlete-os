import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json()

    const systemPrompt = `You are an AI coach for a student-athlete. You have access to their training and academic data.

Training this week:
${context.training}

Upcoming academic deadlines:
${context.academic}

Keep responses concise — 2-3 sentences max. Be direct and actionable.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 150,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ message: text })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ message: 'Something went wrong. Try again.' }, { status: 500 })
  }
}