import { prisma } from './prisma'

export class MessageService {
    static async fetchSlackMessages(userId) {
        try {
            console.log('🔍 Starting Slack message fetch for user:', userId)


            // Get user's Slack access token
            const slackAccount = await prisma.account.findFirst({
                where: {
                    userId: userId,
                    provider: 'slack'
                }
            })

            if (!slackAccount) {
                console.log('❌ No Slack account found for user:', userId)
                return []
            }

            console.log("Slack access token:", slackAccount.access_token)

            console.log('✅ Found Slack account, token starts with:', slackAccount.access_token.substring(0, 10) + '...')

            // Test the token first
            const testResponse = await fetch('https://slack.com/api/auth.test', {
                headers: {
                    'Authorization': `Bearer ${slackAccount.access_token}`,
                    'Content-Type': 'application/json'
                }
            })

            const testResult = await testResponse.json()
            console.log('🔑 Slack auth test result:', testResult)

            if (!testResult.ok) {
                console.error('❌ Slack token invalid:', testResult.error)
                return []
            }

            // Fetch conversations
            console.log('📋 Fetching Slack conversations...')
            const conversationsResponse = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel,mpim,im', {
                headers: {
                    'Authorization': `Bearer ${slackAccount.access_token}`,
                    'Content-Type': 'application/json'
                }
            })

            const conversations = await conversationsResponse.json()
            console.log('📋 Conversations response:', JSON.stringify(conversations, null, 2))

            if (!conversations.ok) {
                console.error('❌ Slack conversations error:', conversations.error)
                return []
            }

            console.log(`📋 Found ${conversations.channels?.length || 0} conversations`)

            const messages = []

            // Fetch messages from each conversation
            const channelsToCheck = conversations.channels?.slice(0, 3) || [] // Check first 3 channels

            for (const channel of channelsToCheck) {
                console.log(`💬 Fetching messages from channel: ${channel.name || channel.id}`)

                try {
                    const historyResponse = await fetch(`https://slack.com/api/conversations.history?channel=${channel.id}&limit=5`, {
                        headers: {
                            'Authorization': `Bearer ${slackAccount.access_token}`,
                            'Content-Type': 'application/json'
                        }
                    })

                    const history = await historyResponse.json()
                    console.log(`💬 History for ${channel.name}:`, JSON.stringify(history, null, 2))

                    if (history.ok && history.messages) {
                        console.log(`💬 Found ${history.messages.length} messages in ${channel.name}`)

                        for (const message of history.messages) {
                            console.log('📝 Processing message:', {
                                text: message.text,
                                user: message.user,
                                ts: message.ts,
                                bot_id: message.bot_id
                            })

                            // Skip bot messages and messages without text
                            if (message.bot_id || !message.text) {
                                console.log('⏭️  Skipping message (bot or no text)')
                                continue
                            }

                            // Check if we already have this message
                            const existingMessage = await prisma.message.findFirst({
                                where: {
                                    platform: 'slack',
                                    messageId: message.ts
                                }
                            })

                            if (!existingMessage) {
                                console.log('✨ New message found, will save:', message.text)
                                messages.push({
                                    userId: userId,
                                    platform: 'slack',
                                    content: message.text,
                                    sender: message.user || 'Unknown',
                                    timestamp: new Date(message.ts * 1000),
                                    messageId: message.ts,
                                    threadId: message.thread_ts || null
                                })
                            } else {
                                console.log('⏭️  Message already exists:', message.ts)
                            }
                        }
                    } else {
                        console.log('❌ No messages or error:', history.error)
                    }
                } catch (channelError) {
                    console.error('❌ Error fetching channel messages:', channelError)
                }
            }

            // Save new messages to database
            if (messages.length > 0) {
                console.log(`💾 Saving ${messages.length} new messages to database`)
                const savedMessages = await prisma.message.createMany({
                    data: messages,
                    skipDuplicates: true
                })
                console.log('✅ Messages saved successfully:', savedMessages)
            } else {
                console.log('📭 No new messages to save')
            }

            return messages
        } catch (error) {
            console.error('❌ Error fetching Slack messages:', error)
            return []
        }
    }

    static async fetchGitHubNotifications(userId) {
        try {
            console.log('🔍 Starting GitHub notification fetch for user:', userId)

            const githubAccount = await prisma.account.findFirst({
                where: {
                    userId: userId,
                    provider: 'github'
                }
            })

            if (!githubAccount) {
                console.log('❌ No GitHub account found for user:', userId)
                return []
            }

            console.log('✅ Found GitHub account, token starts with:', githubAccount.access_token.substring(0, 10) + '...')

            // Test the token first
            const testResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${githubAccount.access_token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'MessageHub'
                }
            })

            const testResult = await testResponse.json()
            console.log('🔑 GitHub auth test result:', testResult.login || testResult.message)

            if (testResult.message) {
                console.error('❌ GitHub token invalid:', testResult.message)
                return []
            }

            // Fetch notifications
            console.log('🔔 Fetching GitHub notifications...')
            const response = await fetch('https://api.github.com/notifications?all=false&participating=false', {
                headers: {
                    'Authorization': `token ${githubAccount.access_token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'MessageHub'
                }
            })

            const notifications = await response.json()
            console.log('🔔 GitHub notifications response:', JSON.stringify(notifications, null, 2))

            if (!Array.isArray(notifications)) {
                console.error('❌ GitHub notifications error:', notifications)
                return []
            }

            console.log(`🔔 Found ${notifications.length} notifications`)

            const messages = []

            for (const notification of notifications.slice(0, 5)) {
                console.log('📝 Processing notification:', {
                    title: notification.subject.title,
                    type: notification.subject.type,
                    repo: notification.repository.full_name
                })

                // Check if we already have this notification
                const existingMessage = await prisma.message.findFirst({
                    where: {
                        platform: 'github',
                        messageId: notification.id
                    }
                })

                if (!existingMessage) {
                    console.log('✨ New notification found:', notification.subject.title)
                    messages.push({
                        userId: userId,
                        platform: 'github',
                        content: `${notification.subject.title} (${notification.subject.type})`,
                        sender: notification.repository.full_name,
                        timestamp: new Date(notification.updated_at),
                        messageId: notification.id,
                        threadId: null
                    })
                } else {
                    console.log('⏭️  Notification already exists:', notification.id)
                }
            }

            // Save new messages to database
            if (messages.length > 0) {
                console.log(`💾 Saving ${messages.length} new GitHub notifications`)
                await prisma.message.createMany({
                    data: messages,
                    skipDuplicates: true
                })
                console.log('✅ GitHub notifications saved')
            } else {
                console.log('📭 No new GitHub notifications to save')
            }

            return messages
        } catch (error) {
            console.error('❌ Error fetching GitHub notifications:', error)
            return []
        }
    }

    static async fetchAllMessages(userId) {
        console.log('🚀 Starting message sync for user:', userId)
        const slackMessages = await this.fetchSlackMessages(userId)
        const githubMessages = await this.fetchGitHubNotifications(userId)

        console.log(`📊 Sync complete: ${slackMessages.length} Slack + ${githubMessages.length} GitHub = ${slackMessages.length + githubMessages.length} total`)
        return [...slackMessages, ...githubMessages]
    }
}