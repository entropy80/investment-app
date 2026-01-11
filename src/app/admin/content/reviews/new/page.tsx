import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ReviewForm } from "@/components/admin/review-form"

export default async function NewReviewPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  return <ReviewForm authorId={session.user.id} />
}
