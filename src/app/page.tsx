import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowRight,
  Upload,
  PieChart,
  TrendingUp,
  Globe,
  Users,
  Target,
  Shield,
  CreditCard,
  Sparkles,
  Github,
} from 'lucide-react'

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      {/* Hero Section - Split Layout */}
      <section className="mb-16 md:mb-24">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: Text Content */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Track your global investments in one place
            </h1>
            <p className="text-xl text-muted-foreground">
              Consolidate portfolios across brokerages and currencies.
              See your complete financial picture with real-time valuations.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" asChild>
                <Link href="/demo">
                  Try Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth/signup">Sign Up Free</Link>
              </Button>
            </div>
            {/* Trust Signals - Inline */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                Free forever
              </span>
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-primary" />
                No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" />
                Your data stays private
              </span>
              <a
                href="https://github.com/entropy80/investment-app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Github className="h-4 w-4 text-primary" />
                Open source
              </a>
            </div>
          </div>

          {/* Right: Portfolio Preview Mockup */}
          <div className="relative">
            <Card className="overflow-hidden border-2">
              <CardContent className="p-0">
                {/* Mockup Header */}
                <div className="bg-muted/50 border-b px-4 py-3 flex items-center justify-between">
                  <span className="font-semibold">Demo Portfolio</span>
                  <span className="text-xs text-muted-foreground">Live Preview</span>
                </div>
                {/* Mockup Content */}
                <div className="p-4 space-y-4">
                  {/* Summary Cards Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Total Value</p>
                      <p className="text-lg font-bold">$54,230</p>
                      <p className="text-xs text-green-600">+$4,705 (9.5%)</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Accounts</p>
                      <p className="text-lg font-bold">5</p>
                      <p className="text-xs text-muted-foreground">3 currencies</p>
                    </div>
                  </div>
                  {/* Holdings Preview */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Holdings</p>
                    <div className="space-y-1.5">
                      {[
                        { symbol: 'VTI', name: 'Vanguard Total Stock', value: '$13,275', change: '+18%' },
                        { symbol: 'AAPL', name: 'Apple Inc.', value: '$3,720', change: '+42%' },
                        { symbol: 'BTC', name: 'Bitcoin', value: '$14,775', change: '+119%' },
                      ].map((holding) => (
                        <div key={holding.symbol} className="flex items-center justify-between py-1.5 border-b border-dashed last:border-0">
                          <div>
                            <span className="font-medium text-sm">{holding.symbol}</span>
                            <span className="text-xs text-muted-foreground ml-2">{holding.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium">{holding.value}</span>
                            <span className="text-xs text-green-600 ml-2">{holding.change}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Currency Badges */}
                  <div className="flex gap-2 pt-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">USD</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">EUR</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">GBP</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">CHF</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Decorative gradient */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-xl blur-xl -z-10" />
          </div>
        </div>
      </section>

      {/* Key Benefits - Horizontal */}
      <section className="mb-16 md:mb-24">
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Import</h3>
              <p className="text-sm text-muted-foreground">
                Upload CSV from Schwab, IBKR, or add holdings manually. Automatic duplicate detection.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <PieChart className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Track</h3>
              <p className="text-sm text-muted-foreground">
                Real-time prices, multi-currency conversion, and allocation breakdowns across all accounts.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Analyze</h3>
              <p className="text-sm text-muted-foreground">
                FIFO tax lot tracking, realized gains reporting with short/long-term classification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Built For - Audience Badges */}
      <section className="mb-16 md:mb-24 text-center">
        <p className="text-sm text-muted-foreground uppercase tracking-wide mb-4">Built for</p>
        <div className="flex flex-wrap justify-center gap-3">
          <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Expats</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Digital Nomads</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">DIY Investors</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Global Diversifiers</span>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="mb-16 md:mb-24">
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-3xl font-bold text-primary">5</p>
                <p className="text-sm text-muted-foreground">Currencies supported</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">2</p>
                <p className="text-sm text-muted-foreground">Broker imports</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">FIFO</p>
                <p className="text-sm text-muted-foreground">Tax lot tracking</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">Free</p>
                <p className="text-sm text-muted-foreground">Forever</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Final CTA */}
      <section className="text-center pb-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          Ready to consolidate your portfolio?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Try the demo with sample data, or create your free account to start tracking your investments.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" asChild>
            <Link href="/demo">
              Try Demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/auth/signup">Create Free Account</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
