import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request) {
    try {
        const body = await request.json()
        console.log('Slack webhook received:', JSON.stringify(body, null, 2))

        // Slack URL verification challenge
        if (body.challenge) {
            console.log('Slack challenge received:', body.challenge)
            return NextResponse.json({ challenge: body.challenge })
        }

        // Handle Slack events
        if (body.event) {
            const event = body.event
            console.log('Slack event type:', event.type)

            // Only process message events
            if (event.type === 'message' && event.text && !event.bot_id) {
                console.log('Processing message:', event.text)

                // Find the user by their Slack team ID or user ID
                // For now, let's find any user with a Slack connection
                const user = await prisma.user.findFirst({
                    where: {
                        accounts: {
                            some: {
                                provider: 'slack'
                            }
                        }
                    }
                })

                if (user) {
                    // Create the message in database
                    await prisma.message.create({
                        data: {
                            userId: user.id,
                            platform: 'slack',
                            content: event.text,
                            sender: event.user || 'Unknown',
                            timestamp: new Date(event.ts * 1000), // Slack uses Unix timestamp
                            messageId: event.ts + '_' + event.user,
                            threadId: event.thread_ts || null
                        }
                    })

                    console.log('Message saved to database!')
                } else {
                    console.log('No user found with Slack connection')
                }
            }

            return NextResponse.json({ status: 'ok' })
        }

        return NextResponse.json({ status: 'no event' })
    } catch (error) {
        console.error('Slack webhook error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}