import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getArticleById } from "@/lib/content/content-service"
import { ArticleForm } from "@/components/admin/article-form"

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  const { id } = await params

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const article = await getArticleById(id)

  if (!article) {
    notFound()
  }

  return <ArticleForm article={article} authorId={session.user.id} />
}
