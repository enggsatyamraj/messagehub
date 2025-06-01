'use client'

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function ConnectionsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">Loading...</div>
            </div>
        )
    }

    if (!session) {
        router.push('/')
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
                        <h1 className="text-2xl font-bold text-slate-900">Manage Connections</h1>

                        <div className="flex items-center space-x-2">
                            <Button
                                onClick={() => router.push('/dashboard')}
                                variant="ghost"
                                size="sm"
                            >
                                ← Back to Dashboard
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
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Connected Accounts</CardTitle>
                        <CardDescription>
                            Manage your connected platforms to unify your messages
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="space-y-4">
                            {/* User Info */}
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <h3 className="font-medium text-slate-900">Account Information</h3>
                                <p className="text-sm text-slate-600 mt-1">
                                    Logged in as {session.user.name || session.user.email}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {session.user.connections?.length || 0} platform(s) connected
                                </p>
                            </div>

                            <Separator />

                            {/* Slack Connection */}
                            <div className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${hasSlack ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                                }`}>
                                <div className="flex items-center space-x-4">
                                    <div className={`w-4 h-4 rounded-full ${hasSlack ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                    <div>
                                        <h3 className="font-medium text-slate-900">Slack</h3>
                                        <p className="text-sm text-slate-600">
                                            {hasSlack ? 'Connected and receiving messages' : 'Connect to receive Slack messages'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {hasSlack ? (
                                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                            ✓ Connected
                                        </Badge>
                                    ) : (
                                        <Button
                                            onClick={() => signIn('slack')}
                                            className="bg-purple-600 hover:bg-purple-700 text-white"
                                        >
                                            Connect Slack
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* GitHub Connection */}
                            <div className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${hasGitHub ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                                }`}>
                                <div className="flex items-center space-x-4">
                                    <div className={`w-4 h-4 rounded-full ${hasGitHub ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                    <div>
                                        <h3 className="font-medium text-slate-900">GitHub</h3>
                                        <p className="text-sm text-slate-600">
                                            {hasGitHub ? 'Connected and receiving notifications' : 'Connect to receive GitHub notifications'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {hasGitHub ? (
                                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                            ✓ Connected
                                        </Badge>
                                    ) : (
                                        <Button
                                            onClick={() => signIn('github')}
                                            className="bg-slate-900 hover:bg-slate-800 text-white"
                                        >
                                            Connect GitHub
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {(hasSlack || hasGitHub) && (
                                <>
                                    <Separator />
                                    <div className="flex justify-center">
                                        <Button
                                            onClick={() => router.push('/dashboard')}
                                            size="lg"
                                            className="w-full max-w-md"
                                        >
                                            View Messages in Dashboard →
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}