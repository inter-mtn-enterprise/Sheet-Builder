import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/sheets" className="font-bold text-lg">
                Banner Production
              </Link>
              <div className="flex gap-4">
                <Link
                  href="/sheets"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Sheets
                </Link>
                <Link
                  href="/templates"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Templates
                </Link>
                <Link
                  href="/banners"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Banners
                </Link>
                <Link
                  href="/analytics"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Analytics
                </Link>
              </div>
            </div>
            <form action="/api/auth/logout" method="POST">
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </form>
          </div>
        </div>
      </nav>
      {children}
    </div>
  )
}

