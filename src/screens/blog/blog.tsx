import { getBlogs } from "@/cms/sanityClient"
import EmptyBlogState from "@/components/custom/EmptyState"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Link } from "react-router"

type Blog = {
  id: string
  title: string
  description: string
  image: string
  slug: string
}

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    async function getAndSetBlogs(): Promise<void> {
      const blogs = await getBlogs()
      setBlogs(blogs)
      setLoading(false)
    }
    getAndSetBlogs()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-10 px-4 md:px-12">
      <h1 className="text-3xl md:text-5xl font-bold text-white mb-10 text-center">
        Blog Posts
      </h1>

      {loading && (
        <div className="flex justify-center items-center h-48">
          <svg
            className="animate-spin h-10 w-10 text-accent"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              fill="none"
              strokeWidth="4"
              stroke="currentColor"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4.93 4.93a10 10 0 0 1 14.14 14.14L12 12l-7.07-7.07z"
            />
          </svg>
        </div>
      )}

      {!loading && blogs.length === 0 && <EmptyBlogState />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogs.map((blog) => (
          <Link key={blog.id} href={`/blogs/${blog.slug}`}>
            <Card className="hover:shadow-xl transition-shadow duration-200">
              <CardHeader className="p-0">
                <img
                  src={blog.image}
                  alt={blog.title}
                  className="w-full h-48 object-cover rounded-t-xl"
                />
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-xl font-semibold text-foreground mb-2">
                  {blog.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {blog.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}