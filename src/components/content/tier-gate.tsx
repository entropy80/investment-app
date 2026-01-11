import { SubscriptionTier } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, ArrowRight } from "lucide-react"
import Link from "next/link"
import { getTierDisplayName } from "@/lib/content/access"

interface TierGateProps {
  requiredTier: SubscriptionTier
  isAuthenticated: boolean
  preview?: string
  children: React.ReactNode
}

export function TierGate({
  requiredTier,
  isAuthenticated,
  preview,
  children,
}: TierGateProps) {
  return (
    <div className="relative">
      {/* Preview Content */}
      {preview && (
        <div className="prose prose-slate max-w-none mb-8">
          <p className="text-muted-foreground">{preview}</p>
        </div>
      )}

      {/* Gate Overlay */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background pointer-events-none" />

        <Card className="relative z-10 max-w-lg mx-auto border-2 border-primary/20 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Members-Only Content</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              This content is available to registered members.
              {requiredTier !== 'FREE' && (
                <span className="block mt-2">
                  Access level: <span className="font-semibold text-foreground">{getTierDisplayName(requiredTier)}</span>
                </span>
              )}
            </p>

            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                Create a free account to unlock this and all member content.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            {isAuthenticated ? (
              <Button asChild className="w-full" size="lg">
                <Link href="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild className="w-full" size="lg">
                  <Link href="/auth/signup">
                    Create Free Account
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/auth/signin">Sign in to your account</Link>
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Hidden full content (for SEO) */}
      <div className="sr-only">{children}</div>
    </div>
  )
}
