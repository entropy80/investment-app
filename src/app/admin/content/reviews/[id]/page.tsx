import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getBrokerReviewById } from "@/lib/content/content-service"
import { ReviewForm } from "@/components/admin/review-form"

export default async function EditReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  const { id } = await params

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const review = await getBrokerReviewById(id)

  if (!review) {
    notFound()
  }

  return <ReviewForm review={review} authorId={session.user.id} />
}
