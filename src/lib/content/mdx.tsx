import { compileMDX } from 'next-mdx-remote/rsc'
import { ReactElement } from 'react'
import remarkGfm from 'remark-gfm'

/**
 * Custom MDX components for rendering
 * These components will be available in MDX content
 */
export const mdxComponents = {
  // Headings with custom styling
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-4xl font-bold mt-8 mb-4">{children}</h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-3xl font-bold mt-6 mb-3">{children}</h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-2xl font-semibold mt-5 mb-2">{children}</h3>
  ),
  h4: ({ children }: { children: React.ReactNode }) => (
    <h4 className="text-xl font-semibold mt-4 mb-2">{children}</h4>
  ),

  // Paragraphs and text
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="mb-4 leading-7 text-muted-foreground">{children}</p>
  ),

  // Lists
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="text-muted-foreground">{children}</li>
  ),

  // Links
  a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-4 hover:text-primary/80"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  ),

  // Blockquotes
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">
      {children}
    </blockquote>
  ),

  // Code blocks
  pre: ({ children }: { children: React.ReactNode }) => (
    <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4 text-sm">{children}</pre>
  ),
  code: ({ children }: { children: React.ReactNode }) => (
    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
  ),

  // Tables
  table: ({ children }: { children: React.ReactNode }) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }: { children: React.ReactNode }) => (
    <th className="border border-border px-4 py-2 text-left font-semibold bg-muted">{children}</th>
  ),
  td: ({ children }: { children: React.ReactNode }) => (
    <td className="border border-border px-4 py-2">{children}</td>
  ),

  // Horizontal rule
  hr: () => <hr className="my-8 border-border" />,

  // Images
  img: ({ src, alt }: { src?: string; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt || ''} className="rounded-lg my-4 max-w-full h-auto" />
  ),

  // Strong and emphasis
  strong: ({ children }: { children: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: { children: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
}

/**
 * Compile MDX content to React elements
 *
 * @param source - MDX string content
 * @returns Compiled MDX content ready for rendering
 */
export async function compileMDXContent(source: string): Promise<ReactElement> {
  const { content } = await compileMDX({
    source,
    components: mdxComponents,
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
      },
    },
  })

  return content
}

/**
 * Extract plain text from MDX content (for excerpts/search)
 *
 * @param source - MDX string content
 * @returns Plain text without markdown/MDX syntax
 */
export function extractPlainText(source: string): string {
  return source
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]+`/g, '')
    // Remove images
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove headers markdown
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Remove extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
