import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { HelpCircle, Rocket, Shield, Wrench } from 'lucide-react'

const faqCategories = [
  {
    title: 'Getting Started',
    icon: Rocket,
    questions: [
      {
        question: 'What do I get with a free account?',
        answer:
          'A free account gives you access to all content, broker reviews, video tutorials, and the portfolio tracking tools. No credit card required.',
      },
      {
        question: 'Who is this for?',
        answer:
          'This platform is designed for anyone investing internationally — whether you\'re an expat, digital nomad, or simply want to diversify beyond your local market.',
      },
      {
        question: 'How do I create a portfolio?',
        answer:
          'After signing in, navigate to the Dashboard and click "Create Portfolio". Enter a name, optional description, and select your base currency. Your portfolio will be created instantly and you can start adding accounts.',
      },
      {
        question: 'How do I add accounts to my portfolio?',
        answer:
          'Open your portfolio and click "Add Account". Provide the account name, select the institution type (Brokerage, Bank, Crypto Exchange), choose the account\'s currency, and save. You can add multiple accounts to track investments across different institutions.',
      },
      {
        question: 'How do I add holdings to an account?',
        answer:
          'Within your portfolio, click "Add Holding". Select the account, enter the stock symbol or asset name, choose the asset type (Stock, ETF, Crypto, etc.), and enter the quantity and cost basis. For cash holdings, select CASH and choose the currency.',
      },
    ],
  },
  {
    title: 'Security & Privacy',
    icon: Shield,
    questions: [
      {
        question: 'Is my data safe?',
        answer:
          'We use industry-standard encryption and never share your data with third parties. Your portfolio information is stored securely and you have full control over your data.',
      },
    ],
  },
  {
    title: 'Features',
    icon: Wrench,
    questions: [
      {
        question: 'What brokerages can I import from?',
        answer:
          'Currently, we support CSV imports from Charles Schwab and Interactive Brokers (IBKR). The import process automatically detects the broker format and maps transactions correctly. More brokerages will be added in future updates.',
      },
      {
        question: 'How does the demo mode work?',
        answer:
          'Click "Try Portfolio Demo" to explore the app with sample data. The demo includes a pre-populated portfolio with stocks, crypto, and multi-currency cash holdings across multiple accounts. All features are available in read-only mode so you can explore without signing up.',
      },
    ],
  },
]

export default function FAQ() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      {/* Hero Section */}
      <section className="text-center mb-16">
        <div className="flex justify-center mb-6">
          <HelpCircle className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-6">Frequently Asked Questions</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Find answers to common questions about using Investment-App to track
          your portfolio.
        </p>
      </section>

      {/* FAQ Categories */}
      {faqCategories.map((category, categoryIndex) => (
        <section key={category.title} className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <category.icon className="h-6 w-6 text-primary" />
                {category.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {category.questions.map((item, index) => (
                  <AccordionItem
                    key={index}
                    value={`${categoryIndex}-${index}`}
                  >
                    <AccordionTrigger className="text-left">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent>{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>
      ))}

      {/* Footer Note */}
      <section className="text-center text-sm text-muted-foreground">
        <p>
          Can&apos;t find what you&apos;re looking for? Contact us and we&apos;ll be happy
          to help.
        </p>
      </section>
    </div>
  )
}
