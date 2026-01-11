import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getVideoById } from "@/lib/content/content-service"
import { VideoForm } from "@/components/admin/video-form"

export default async function EditVideoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  const { id } = await params

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const video = await getVideoById(id)

  if (!video) {
    notFound()
  }

  return <VideoForm video={video} authorId={session.user.id} />
}
