import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'  // Add this import
import { MessageService } from '@/app/lib/messageService'

export async function POST() {
    try {
        console.log('🔄 Sync messages API called')

        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            console.log('❌ No session found')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log('👤 User email:', session.user.email)

        // Find the user
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { accounts: true }
        })

        if (!user) {
            console.log('❌ User not found')
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        console.log('✅ User found:', user.id)
        console.log('🔗 Connected accounts:', user.accounts.map(a => a.provider))

        // Fetch messages from all platforms
        const newMessages = await MessageService.fetchAllMessages(user.id)

        console.log('✅ Sync complete')
        return NextResponse.json({
            synced: newMessages.length,
            message: `Synced ${newMessages.length} new messages`
        })
    } catch (error) {
        console.error('❌ Error syncing messages:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}