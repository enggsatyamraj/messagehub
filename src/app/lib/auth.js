import SlackProvider from "next-auth/providers/slack"
import GitHubProvider from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"

export const authOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        // Custom Slack provider configuration to use OAuth 2.0 instead of OpenID Connect
        {
            id: "slack",
            name: "Slack",
            type: "oauth",
            clientId: process.env.SLACK_CLIENT_ID,
            clientSecret: process.env.SLACK_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,

            // Use traditional OAuth 2.0 endpoints instead of OpenID Connect
            authorization: {
                url: "https://slack.com/oauth/v2/authorize",
                params: {
                    scope: "users:read", // Bot scopes (minimal)
                    user_scope: "channels:history channels:read groups:history groups:read im:history im:read mpim:history mpim:read users:read" // User scopes
                }
            },

            token: "https://slack.com/api/oauth.v2.access",
            userinfo: "https://slack.com/api/users.info",

            profile(profile, tokens) {
                console.log('=== SLACK PROFILE ===')
                console.log('Profile:', profile)
                console.log('Tokens:', tokens)
                console.log('====================')

                return {
                    id: profile.user?.id || profile.sub,
                    name: profile.user?.name || profile.name,
                    email: profile.user?.email || profile.email,
                    image: profile.user?.image_72 || profile.picture
                }
            },

            // Handle the token exchange and user info fetching
            async profile(profile, tokens) {
                console.log('=== SLACK TOKENS ===')
                console.log('Access token:', tokens.access_token?.substring(0, 10) + '...')
                console.log('Token type:', tokens.token_type)
                console.log('Scope:', tokens.scope)
                console.log('User token:', tokens.authed_user?.access_token?.substring(0, 10) + '...')
                console.log('User scope:', tokens.authed_user?.scope)
                console.log('===================')

                // The user information should come from the auth test
                const userResponse = await fetch('https://slack.com/api/auth.test', {
                    headers: {
                        'Authorization': `Bearer ${tokens.authed_user?.access_token || tokens.access_token}`,
                        'Content-Type': 'application/json'
                    }
                })

                const userInfo = await userResponse.json()
                console.log('Auth test result:', userInfo)

                if (!userInfo.ok) {
                    throw new Error(`Slack auth test failed: ${userInfo.error}`)
                }

                // Get detailed user information
                const userDetailResponse = await fetch(`https://slack.com/api/users.info?user=${userInfo.user_id}`, {
                    headers: {
                        'Authorization': `Bearer ${tokens.access_token}`, // Use bot token for users.info
                        'Content-Type': 'application/json'
                    }
                })

                const userDetail = await userDetailResponse.json()
                console.log('User detail result:', userDetail)

                // Generate a fallback email if none provided
                const email = userDetail.user?.profile?.email || `${userInfo.user_id}@slack.local`

                return {
                    id: userInfo.user_id,
                    name: userDetail.user?.real_name || userDetail.user?.name || userInfo.user,
                    email: email,
                    image: userDetail.user?.profile?.image_72
                }
            }
        },
        GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
        })
    ],
    pages: {
        signIn: '/',
    },
    debug: true,
    callbacks: {
        async signIn({ user, account, profile }) {
            console.log('=== SIGNIN CALLBACK ===')
            console.log('User:', user)
            console.log('Account:', account)
            console.log('Profile:', profile)

            if (account?.provider === "slack") {
                // Store the user token from authed_user.access_token
                const userToken = account.authed_user?.access_token
                const botScopes = account.scope || ''
                const userScopes = account.authed_user?.scope || ''

                console.log('🔑 Storing user token in refresh_token field')

                // Clean up the account object to only include Prisma-compatible fields
                // Keep only the fields that exist in your Prisma Account schema
                const cleanAccount = {
                    provider: account.provider,
                    type: account.type,
                    providerAccountId: account.providerAccountId,
                    access_token: account.access_token, // Bot token
                    refresh_token: userToken, // User token (stored here since Slack doesn't use refresh tokens)
                    scope: `bot:${botScopes}|user:${userScopes}`, // Combined scopes
                    token_type: account.token_type,
                    expires_at: account.expires_at || null,
                    id_token: account.id_token || null,
                    session_state: account.session_state || null
                }

                // Replace all account properties with cleaned ones
                Object.keys(account).forEach(key => delete account[key])
                Object.assign(account, cleanAccount)

                console.log('Slack account details after cleanup:', account)
            }

            console.log('========================')
            return true
        },
        async session({ session, token, user }) {
            console.log('=== SESSION CALLBACK ===')

            if (session?.user?.email) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { email: session.user.email },
                        include: {
                            accounts: {
                                select: {
                                    provider: true,
                                    providerAccountId: true,
                                    access_token: true,
                                    scope: true
                                }
                            }
                        }
                    })

                    if (dbUser) {
                        session.user.id = dbUser.id
                        session.user.connections = dbUser.accounts.map(account => ({
                            platform: account.provider,
                            id: account.providerAccountId,
                            hasToken: !!account.access_token,
                            scopes: account.scope
                        }))

                        console.log('User connections:', session.user.connections)
                    }
                } catch (error) {
                    console.error('Error loading user connections:', error)
                }
            }

            console.log('Final session:', session)
            console.log('=========================')
            return session
        }
    },
    events: {
        async linkAccount(message) {
            console.log('=== LINK ACCOUNT EVENT ===')
            console.log('Link account event:', JSON.stringify(message, null, 2))
            console.log('===========================')
        }
    }
}