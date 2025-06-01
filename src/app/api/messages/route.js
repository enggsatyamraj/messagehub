import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Find the user
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // For now, return empty messages since we haven't set up webhooks yet
        // Later this will fetch real messages from the database
        const messages = []

        // Uncomment this when we start storing real messages:
        /*
        const messages = await prisma.message.findMany({
          where: { userId: user.id },
          orderBy: { timestamp: 'desc' },
          take: 50 // Limit to 50 most recent messages
        })
        */

        return NextResponse.json({
            messages,
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        })
    } catch (error) {
        console.error('Error fetching messages:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST endpoint for when webhooks create new messages
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { platform, content, sender, timestamp, messageId, threadId } = body

        // Validate required fields
        if (!platform || !content || !sender || !messageId) {
            return NextResponse.json({
                error: 'Missing required fields: platform, content, sender, messageId'
            }, { status: 400 })
        }

        // Find the user
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Create the message
        const message = await prisma.message.create({
            data: {
                userId: user.id,
                platform,
                content,
                sender,
                timestamp: timestamp ? new Date(timestamp) : new Date(),
                messageId,
                threadId
            }
        })

        return NextResponse.json({ message })
    } catch (error) {
        console.error('Error creating message:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}