import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowRight,
  Briefcase,
  Building2,
  Coins,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  PieChart,
  Calculator,
  Calendar,
  Clock,
  BarChart3,
  RefreshCw,
  FileText,
} from 'lucide-react'

export default function Features() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-16 max-w-5xl">
      {/* Hero Section */}
      <section className="text-center mb-12 md:mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Everything you need to track global investments
        </h1>
        <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
          A complete portfolio tracker built for international investors.
          Consolidate accounts, track performance, and simplify tax reporting.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
      </section>

      {/* Portfolio Management */}
      <section className="mb-12 md:mb-16">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Portfolio Management
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Multiple Portfolios</h3>
                  <p className="text-sm text-muted-foreground">
                    Create separate portfolios for different goals — retirement, trading, or family investments.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Multiple Accounts</h3>
                  <p className="text-sm text-muted-foreground">
                    Add brokerage, bank, and crypto exchange accounts. Track everything in one place.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Coins className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Multi-Currency Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Holdings in USD, EUR, GBP, CHF, and KWD. Automatic conversion to your display currency.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">All Asset Types</h3>
                  <p className="text-sm text-muted-foreground">
                    Stocks, ETFs, mutual funds, bonds, crypto, cash, and real estate. One unified view.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Data Import */}
      <section className="mb-12 md:mb-16">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Data Import
        </h2>
        <Card>
          <CardContent className="py-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">CSV Import</h3>
                <p className="text-sm text-muted-foreground">
                  Import transaction history from your brokerage with a single file upload.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Charles Schwab</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Interactive Brokers</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">More coming soon</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Auto-detect broker format
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Duplicate transaction detection
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Automatic holding creation
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Import rollback support
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Tracking & Analytics */}
      <section className="mb-12 md:mb-16">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Tracking & Analytics
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Real-Time Prices</h3>
                  <p className="text-sm text-muted-foreground">
                    Current market prices via Alpha Vantage API. See live valuations for all holdings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <PieChart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Allocation Breakdown</h3>
                  <p className="text-sm text-muted-foreground">
                    See your portfolio composition by asset type. Understand your diversification at a glance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Unrealized Gains</h3>
                  <p className="text-sm text-muted-foreground">
                    Track paper gains and losses per holding. See total portfolio performance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calculator className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Realized Gains</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatic calculation when you sell. Short-term and long-term classification included.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Tax Features */}
      <section className="mb-12 md:mb-16">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Tax Lot Tracking
        </h2>
        <Card>
          <CardContent className="py-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calculator className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">FIFO Method</h3>
                  <p className="text-xs text-muted-foreground">
                    First-in, first-out cost basis calculation
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">Holding Period</h3>
                  <p className="text-xs text-muted-foreground">
                    Track days held for ST/LT classification
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Coins className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">Cost Basis</h3>
                  <p className="text-xs text-muted-foreground">
                    Per-lot tracking for accurate gains
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">Acquisition Date</h3>
                  <p className="text-xs text-muted-foreground">
                    Track purchase dates per tax lot
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Coming Soon */}
      <section className="mb-12 md:mb-16">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Coming Soon
        </h2>
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-6">
            <div className="grid sm:grid-cols-3 gap-6 text-center">
              <div className="flex flex-col items-center gap-2">
                <BarChart3 className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Historical Charts</p>
                  <p className="text-xs text-muted-foreground">Performance over time</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Auto Refresh</p>
                  <p className="text-xs text-muted-foreground">Scheduled price updates</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Tax Reports</p>
                  <p className="text-xs text-muted-foreground">Schedule D, Form 8949</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Final CTA */}
      <section className="text-center pb-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          See it in action
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Explore the demo portfolio with sample data to see all features in action.
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
