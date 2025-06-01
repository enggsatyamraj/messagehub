import SlackProvider from "next-auth/providers/slack"
import GitHubProvider from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"

export const authOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        SlackProvider({
            clientId: process.env.SLACK_CLIENT_ID,
            clientSecret: process.env.SLACK_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    scope: "channels:history channels:read groups:history groups:read im:history im:read mpim:history mpim:read users:read"
                }
            }
        }),
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
                delete account.ok
                delete account.state
                console.log('Cleaned Slack account:', account)
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
                                    providerAccountId: true
                                }
                            }
                        }
                    })

                    if (dbUser) {
                        session.user.id = dbUser.id
                        session.user.connections = dbUser.accounts.map(account => ({
                            platform: account.provider,
                            id: account.providerAccountId
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
            console.log('Link account event:', message)
            console.log('===========================')
        }
    }
}