import { compileMDXContent } from "@/lib/content/mdx"

interface MDXRendererProps {
  content: string
}

export async function MDXRenderer({ content }: MDXRendererProps) {
  const compiledContent = await compileMDXContent(content)

  return (
    <div className="prose prose-slate max-w-none dark:prose-invert">
      {compiledContent}
    </div>
  )
}
