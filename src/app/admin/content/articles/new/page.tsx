import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ArticleForm } from "@/components/admin/article-form"

export default async function NewArticlePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  return <ArticleForm authorId={session.user.id} />
}
