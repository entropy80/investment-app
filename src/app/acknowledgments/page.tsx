import Link from 'next/link'

export default function Acknowledgments() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-4xl font-bold mb-8">Acknowledgments</h1>

      <p className="text-muted-foreground mb-12">
        This project is built with the help of many open source projects and services.
      </p>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Infrastructure</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li>
            <Link href="https://vercel.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Vercel
            </Link>
            {' '}- Production hosting
          </li>
          <li>
            <Link href="https://neon.tech/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Neon
            </Link>
            {' '}- Serverless PostgreSQL
          </li>
          <li>
            <Link href="https://www.hetzner.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Hetzner
            </Link>
            {' '}- Development server
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Core Technologies</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li>
            <Link href="https://nextjs.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Next.js
            </Link>
            {' '}- React framework by Vercel
          </li>
          <li>
            <Link href="https://react.dev/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              React
            </Link>
            {' '}- UI library by Meta
          </li>
          <li>
            <Link href="https://nodejs.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Node.js
            </Link>
            {' '}- JavaScript runtime
          </li>
          <li>
            <Link href="https://www.postgresql.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              PostgreSQL
            </Link>
            {' '}- Database
          </li>
          <li>
            <Link href="https://www.typescriptlang.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              TypeScript
            </Link>
            {' '}- Type-safe JavaScript by Microsoft
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Libraries</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li>
            <Link href="https://www.prisma.io/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Prisma
            </Link>
            {' '}- Database ORM
          </li>
          <li>
            <Link href="https://next-auth.js.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              NextAuth.js
            </Link>
            {' '}- Authentication
          </li>
          <li>
            <Link href="https://tailwindcss.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Tailwind CSS
            </Link>
            {' '}- Styling
          </li>
          <li>
            <Link href="https://www.radix-ui.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Radix UI
            </Link>
            {' '}- UI primitives
          </li>
          <li>
            <Link href="https://lucide.dev/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Lucide
            </Link>
            {' '}- Icons
          </li>
          <li>
            <Link href="https://react-hook-form.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              React Hook Form
            </Link>
            {' '}- Form handling
          </li>
          <li>
            <Link href="https://www.papaparse.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              PapaParse
            </Link>
            {' '}- CSV parsing
          </li>
          <li>
            <Link href="https://date-fns.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              date-fns
            </Link>
            {' '}- Date utilities
          </li>
          <li>
            <Link href="https://mikemcl.github.io/decimal.js/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              decimal.js
            </Link>
            {' '}- Precision math
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">External APIs</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li>
            <Link href="https://www.alphavantage.co/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Alpha Vantage
            </Link>
            {' '}- Stock prices
          </li>
          <li>
            <Link href="https://www.frankfurter.app/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Frankfurter
            </Link>
            {' '}- Exchange rates
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">AI</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li>
            <Link href="https://www.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Anthropic Claude
            </Link>
            {' '}- AI assistant used in development
          </li>
        </ul>
      </section>

      <hr className="my-10 border-border" />

      <p className="text-muted-foreground text-center">
        Thank you to all the maintainers and contributors of these projects.
      </p>
    </div>
  )
}
