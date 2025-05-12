import { AlertCircle } from "lucide-react"

export default function EmptyBlogState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4 text-foreground rounded-xl">
      <AlertCircle className="w-10 h-10 mb-4 opacity-80" />
      <h2 className="text-2xl font-semibold mb-2">No blog posts yet</h2>
      <p className="text-foreground max-w-md">
        We're working on some articles. Check back soon to read insights, guides, and updates.
      </p>
    </div>
  )
}
