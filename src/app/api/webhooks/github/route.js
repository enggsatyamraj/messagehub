import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request) {
    try {
        const body = await request.json()
        console.log('GitHub webhook received:', JSON.stringify(body, null, 2))

        // Find user with GitHub connection
        const user = await prisma.user.findFirst({
            where: {
                accounts: {
                    some: {
                        provider: 'github'
                    }
                }
            }
        })

        if (!user) {
            console.log('No user found with GitHub connection')
            return NextResponse.json({ status: 'no user' })
        }

        let content = ''
        let sender = body.sender?.login || 'Unknown'
        let messageId = ''

        // Handle different GitHub events
        if (body.action && body.issue) {
            // Issue events
            content = `${body.action} issue: ${body.issue.title}`
            messageId = `issue_${body.issue.id}_${body.action}`
        } else if (body.action && body.pull_request) {
            // Pull request events
            content = `${body.action} pull request: ${body.pull_request.title}`
            messageId = `pr_${body.pull_request.id}_${body.action}`
        } else if (body.commits) {
            // Push events
            const commitCount = body.commits.length
            content = `Pushed ${commitCount} commit(s) to ${body.repository.name}`
            messageId = `push_${body.after}`
        } else {
            // Generic event
            content = `GitHub ${body.action || 'activity'} in ${body.repository?.name || 'repository'}`
            messageId = `github_${Date.now()}`
        }

        // Create the message
        await prisma.message.create({
            data: {
                userId: user.id,
                platform: 'github',
                content,
                sender,
                timestamp: new Date(),
                messageId,
                threadId: null
            }
        })

        console.log('GitHub message saved to database!')
        return NextResponse.json({ status: 'ok' })
    } catch (error) {
        console.error('GitHub webhook error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}