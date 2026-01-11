import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Code2, Shield, Users } from 'lucide-react'

export default function About() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      {/* Hero Section */}
      <section className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-6">
          About Investment-App
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          A portfolio tracking and investment education platform built for the modern global investor.
        </p>
      </section>

      {/* Development Section */}
      <section className="mb-16">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Code2 className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-semibold mb-3">Built with Claude Code</h2>
                <p className="text-muted-foreground">
                  This application was developed utilizing{' '}
                  <a
                    href="https://claude.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Claude Code
                  </a>
                  , an AI-powered development tool by Anthropic. The entire codebase, from database design
                  to user interface, was created through collaborative AI-assisted development.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Data Privacy Section */}
      <section className="mb-16">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Shield className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-semibold mb-3">Data & Privacy</h2>
                <p className="text-muted-foreground">
                  By using this application, you acknowledge and consent to the sharing of your data
                  with the application&apos;s creator and the creators of the tools employed in its development.
                  We recommend treating portfolio data with appropriate care and understanding that
                  this is a personal project, not a commercial financial service.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Credits Section */}
      <section className="mb-16">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Users className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-semibold mb-3">Credits & Acknowledgments</h2>
                <p className="text-muted-foreground mb-4">
                  This project was made possible by numerous open-source libraries, APIs, and tools.
                  We believe in giving credit where it&apos;s due.
                </p>
                <Link
                  href="/acknowledgments"
                  className="text-primary hover:underline font-medium"
                >
                  View full acknowledgments →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer Note */}
      <section className="text-center text-sm text-muted-foreground">
        <p>
          Investment-App is an independent project and is not affiliated with any brokerage or financial institution.
        </p>
      </section>
    </div>
  )
}
