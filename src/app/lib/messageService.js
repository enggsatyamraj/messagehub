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

            console.log('🔑 Slack account found')
            console.log('🔑 Bot token:', slackAccount.access_token?.substring(0, 10) + '...')
            console.log('🔑 User token:', slackAccount.refresh_token?.substring(0, 10) + '...' || 'not found')
            console.log('🔑 Scopes:', slackAccount.scope)

            // Use the user token stored in refresh_token field for API calls
            // (We store it there because Slack doesn't use refresh tokens)
            let userToken = slackAccount.refresh_token || slackAccount.access_token

            if (!userToken) {
                console.error('❌ No token available')
                return []
            }

            console.log('🔑 Using token type:', userToken.startsWith('xoxp-') ? 'user token' : 'bot token')

            // Test the token with auth.test to see what scopes it has
            const testResponse = await fetch('https://slack.com/api/auth.test', {
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            })

            const testResult = await testResponse.json()
            console.log('🔑 Slack auth test result:', testResult)

            if (!testResult.ok) {
                console.error('❌ Slack token invalid:', testResult.error)
                return []
            }

            // Make a test call to conversations.list to check scopes
            console.log('🧪 Testing conversations.list to check scopes...')
            const scopeTestResponse = await fetch('https://slack.com/api/conversations.list?limit=1', {
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            })

            const scopeTest = await scopeTestResponse.json()
            console.log('🧪 Scope test result:', scopeTest)

            if (!scopeTest.ok) {
                console.error('❌ Scope test failed:', scopeTest.error)
                console.error('❌ Needed:', scopeTest.needed)
                console.error('❌ Provided:', scopeTest.provided)
                return []
            }

            // If we get here, the token works for conversations.list
            console.log('✅ Token has correct scopes!')

            // Fetch conversations - limit to reduce API calls
            console.log('📋 Fetching Slack conversations...')
            const conversationsResponse = await fetch('https://slack.com/api/conversations.list?types=public_channel&limit=3', {
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            })

            const conversations = await conversationsResponse.json()

            if (!conversations.ok) {
                console.error('❌ Slack conversations error:', conversations.error)
                return []
            }

            console.log(`📋 Found ${conversations.channels?.length || 0} conversations`)

            const messages = []

            // Only fetch from 1 channel to avoid rate limits
            const channelsToCheck = conversations.channels?.slice(0, 1) || []

            for (let i = 0; i < channelsToCheck.length; i++) {
                const channel = channelsToCheck[i]
                console.log(`💬 Fetching messages from channel: ${channel.name || channel.id}`)

                try {
                    // Add delay even before first API call
                    console.log('⏳ Waiting 2 seconds to avoid rate limits...')
                    await new Promise(resolve => setTimeout(resolve, 2000))

                    const historyResponse = await fetch(`https://slack.com/api/conversations.history?channel=${channel.id}&limit=2`, {
                        headers: {
                            'Authorization': `Bearer ${userToken}`,
                            'Content-Type': 'application/json'
                        }
                    })

                    const history = await historyResponse.json()

                    if (history.ok && history.messages) {
                        console.log(`💬 Found ${history.messages.length} messages in ${channel.name || channel.id}`)

                        for (const message of history.messages) {
                            // Skip bot messages and messages without text
                            if (message.bot_id || !message.text) {
                                continue
                            }

                            console.log('📝 Processing message:', {
                                text: message.text.substring(0, 30) + '...',
                                user: message.user,
                                ts: message.ts
                            })

                            // Check if we already have this message
                            const existingMessage = await prisma.message.findFirst({
                                where: {
                                    platform: 'slack',
                                    messageId: message.ts
                                }
                            })

                            if (!existingMessage) {
                                console.log('✨ New message found, adding to save queue')
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
                                console.log('⏭️  Message already exists in database')
                            }
                        }
                    } else {
                        console.log('❌ History error for channel:', history.error)
                        if (history.error === 'ratelimited') {
                            console.log('⏳ Rate limited - stopping message fetch for now')
                            break // Stop fetching more channels if we hit rate limits
                        }
                    }
                } catch (channelError) {
                    console.error('❌ Error fetching channel messages:', channelError)
                }
            }

            // Save new messages to database
            if (messages.length > 0) {
                console.log(`💾 Saving ${messages.length} new messages to database`)
                try {
                    const savedMessages = await prisma.message.createMany({
                        data: messages,
                        skipDuplicates: true
                    })
                    console.log('✅ Messages saved successfully')
                } catch (saveError) {
                    console.error('❌ Error saving messages:', saveError)
                }
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

            if (!Array.isArray(notifications)) {
                console.error('❌ GitHub notifications error:', notifications)
                return []
            }

            console.log(`🔔 Found ${notifications.length} notifications`)

            const messages = []

            for (const notification of notifications.slice(0, 5)) {
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