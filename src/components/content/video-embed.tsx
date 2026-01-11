import { VideoPlatform } from "@prisma/client"

interface VideoEmbedProps {
  embedUrl: string
  platform: VideoPlatform
  title: string
}

function getEmbedUrl(url: string, platform: VideoPlatform): string {
  // If already an embed URL, return as-is
  if (url.includes("/embed/") || url.includes("player.vimeo.com")) {
    return url
  }

  if (platform === "YOUTUBE") {
    // Convert various YouTube URL formats to embed
    const videoIdMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    )
    if (videoIdMatch) {
      return `https://www.youtube.com/embed/${videoIdMatch[1]}`
    }
  }

  if (platform === "VIMEO") {
    // Convert Vimeo URL to embed
    const videoIdMatch = url.match(/vimeo\.com\/(\d+)/)
    if (videoIdMatch) {
      return `https://player.vimeo.com/video/${videoIdMatch[1]}`
    }
  }

  return url
}

export function VideoEmbed({ embedUrl, platform, title }: VideoEmbedProps) {
  const finalEmbedUrl = getEmbedUrl(embedUrl, platform)

  return (
    <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
      <iframe
        src={finalEmbedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  )
}
