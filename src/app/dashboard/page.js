'use client'

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function Dashboard() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [lastSync, setLastSync] = useState(null)

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push('/')
        }
    }, [status, router])

    useEffect(() => {
        if (session?.user?.id) {
            // Only fetch messages on initial load, don't auto-sync
            fetchMessages()
        }
    }, [session])

    const fetchMessages = async () => {
        try {
            setLoading(true)
            console.log('📥 Fetching messages from database...')

            // Only fetch existing messages, don't sync new ones automatically
            const response = await fetch('/api/messages')
            const data = await response.json()
            setMessages(data.messages || [])
            console.log(`📥 Loaded ${data.messages?.length || 0} messages from database`)
        } catch (error) {
            console.error('Error fetching messages:', error)
        } finally {
            setLoading(false)
        }
    }

    const syncMessages = async () => {
        try {
            setSyncing(true)
            console.log('🔄 Manual sync triggered...')

            // First sync new messages
            const syncResponse = await fetch('/api/sync-messages', { method: 'POST' })
            const syncData = await syncResponse.json()
            console.log('Sync result:', syncData)

            // Then fetch all messages
            await fetchMessages()
            setLastSync(new Date())
        } catch (error) {
            console.error('Error syncing messages:', error)
        } finally {
            setSyncing(false)
        }
    }

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">Loading...</div>
            </div>
        )
    }

    if (!session) {
        return null
    }

    const hasSlack = session?.user?.connections?.find(c => c.platform === 'slack')
    const hasGitHub = session?.user?.connections?.find(c => c.platform === 'github')

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-2xl font-bold text-slate-900">Message Hub</h1>

                            <div className="flex items-center space-x-2">
                                {hasSlack && (
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-1"></div>
                                        Slack
                                    </Badge>
                                )}
                                {hasGitHub && (
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                                        <div className="w-2 h-2 bg-slate-800 rounded-full mr-1"></div>
                                        GitHub
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Button
                                onClick={() => router.push('/connections')}
                                variant="ghost"
                                size="sm"
                            >
                                Manage Connections
                            </Button>

                            <Button
                                onClick={() => signOut()}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {!hasSlack && !hasGitHub ? (
                    <Card className="max-w-md mx-auto">
                        <CardHeader className="text-center">
                            <CardTitle>No accounts connected</CardTitle>
                            <CardDescription>
                                Connect your Slack or GitHub account to start seeing messages here
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <Button onClick={() => router.push('/')}>
                                Connect Accounts
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {/* Sync Status */}
                        {lastSync && (
                            <Alert>
                                <AlertDescription>
                                    Last synced: {lastSync.toLocaleTimeString()}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Messages Card */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Recent Messages</CardTitle>
                                        <CardDescription>
                                            Your latest messages from connected platforms
                                        </CardDescription>
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button
                                            onClick={fetchMessages}
                                            variant="outline"
                                            size="sm"
                                            disabled={loading}
                                        >
                                            {loading ? "Loading..." : "Refresh"}
                                        </Button>
                                        <Button
                                            onClick={syncMessages}
                                            variant="default"
                                            size="sm"
                                            disabled={syncing}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            {syncing ? "Syncing..." : "Sync New"}
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                {loading ? (
                                    <div className="text-center py-8">
                                        <div className="text-slate-500">Loading messages...</div>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <Alert>
                                        <AlertDescription>
                                            No messages yet. Click "Sync New" to fetch your latest messages from connected platforms.
                                            <br />
                                            <small className="text-slate-500 mt-2 block">
                                                Note: Due to API rate limits, syncing may take a moment and only fetches a few recent messages.
                                            </small>
                                        </AlertDescription>
                                    </Alert>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="text-sm text-slate-600 mb-4">
                                            Showing {messages.length} message(s)
                                        </div>
                                        {messages.map((message, index) => (
                                            <div key={message.id}>
                                                <div className="flex items-start space-x-3 p-4 hover:bg-slate-50 rounded-lg transition-colors">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback className={`text-white text-sm font-medium ${message.platform === 'slack' ? 'bg-purple-600' : 'bg-slate-800'
                                                            }`}>
                                                            {message.platform === 'slack' ? 'S' : 'G'}
                                                        </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center space-x-2 mb-1">
                                                            <p className="text-sm font-medium text-slate-900">
                                                                {message.sender}
                                                            </p>
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-xs ${message.platform === 'slack'
                                                                    ? 'border-purple-200 text-purple-700'
                                                                    : 'border-slate-200 text-slate-700'
                                                                    }`}
                                                            >
                                                                {message.platform}
                                                            </Badge>
                                                            <span className="text-xs text-slate-500">
                                                                {new Date(message.timestamp).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-700 leading-relaxed">
                                                            {message.content}
                                                        </p>
                                                    </div>
                                                </div>
                                                {index < messages.length - 1 && <Separator />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    )
}