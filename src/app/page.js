'use client'

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session?.user?.connections?.length > 0) {
      router.push('/dashboard')
    }
  }, [session, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  const hasSlack = session?.user?.connections?.find(c => c.platform === 'slack')
  const hasGitHub = session?.user?.connections?.find(c => c.platform === 'github')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Message Hub
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Connect your Slack and GitHub to see all messages in one place
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-2">
            <CardTitle className="text-center">
              {!session ? "Get Started" : "Your Connections"}
            </CardTitle>
            <CardDescription className="text-center">
              {!session
                ? "Connect your accounts to unify your messages"
                : `Welcome back, ${session.user.name || session.user.email}`
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {!session ? (
              <div className="space-y-3">
                <Button
                  onClick={() => signIn('slack')}
                  className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white"
                  size="lg"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52-2.523A2.528 2.528 0 0 1 5.042 10.12h2.52v2.522a2.528 2.528 0 0 1-2.52 2.523m0-6.58a2.528 2.528 0 0 1-2.52-2.523A2.528 2.528 0 0 1 5.042 3.54a2.528 2.528 0 0 1 2.52 2.522v2.523H5.042zm6.58 0a2.528 2.528 0 0 1-2.52-2.523A2.528 2.528 0 0 1 11.622 3.54a2.528 2.528 0 0 1 2.52 2.522v2.523h-2.52zm0 6.58a2.528 2.528 0 0 1-2.52-2.523v-2.522h2.52a2.528 2.528 0 0 1 2.52 2.522 2.528 2.528 0 0 1-2.52 2.523" />
                  </svg>
                  Connect Slack
                </Button>

                <Button
                  onClick={() => signIn('github')}
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white"
                  size="lg"
                >
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Connect GitHub
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">Connected Accounts</h3>

                  <div className="space-y-2">
                    <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${hasSlack ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                      }`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${hasSlack ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                        <span className="text-sm font-medium">Slack</span>
                      </div>
                      {hasSlack ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                          Connected
                        </Badge>
                      ) : (
                        <Button
                          onClick={() => signIn('slack')}
                          variant="ghost"
                          size="sm"
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                        >
                          Connect
                        </Button>
                      )}
                    </div>

                    <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${hasGitHub ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                      }`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${hasGitHub ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                        <span className="text-sm font-medium">GitHub</span>
                      </div>
                      {hasGitHub ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                          Connected
                        </Badge>
                      ) : (
                        <Button
                          onClick={() => signIn('github')}
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {(hasSlack || hasGitHub) && (
                  <>
                    <Separator />
                    <Button
                      onClick={() => router.push('/dashboard')}
                      className="w-full h-11"
                      size="lg"
                    >
                      Go to Dashboard →
                    </Button>
                  </>
                )}

                <Separator />

                <Button
                  onClick={() => signOut()}
                  variant="outline"
                  className="w-full"
                >
                  Sign Out
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}