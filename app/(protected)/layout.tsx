import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { MobileNav } from "@/components/ui/mobile-nav"
import { WorkerRedirect } from "./worker-redirect"

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

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  const userRole = userData?.role || "worker"

  // For workers, show minimal navigation
  const isWorker = userRole === "worker"

  return (
    <div className="min-h-screen">
      <nav className="border-b relative">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 md:gap-6">
              <Link href={isWorker ? "/work-log" : "/sheets"} className="font-bold text-lg">
                Banner Production
              </Link>
              {/* Desktop navigation links - hidden for workers */}
              {!isWorker && (
                <div className="hidden md:flex gap-4">
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
                  href="/products"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Products
                </Link>
                <Link
                  href="/analytics"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Analytics
                </Link>
                <Link
                  href="/production-manager"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Production Manager
                </Link>
                <Link
                  href="/work-log"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Work Log
                </Link>
                <Link
                  href="/team"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Team
                </Link>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Desktop logout button */}
              <form action="/api/auth/logout" method="POST" className="hidden md:block">
                <Button type="submit" variant="ghost" size="sm">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </form>
              {/* Mobile hamburger menu - hidden for workers */}
              {!isWorker && <MobileNav />}
              {isWorker && (
                <form action="/api/auth/logout" method="POST" className="md:hidden">
                  <Button type="submit" variant="ghost" size="icon">
                    <LogOut className="h-5 w-5" />
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </nav>
      <WorkerRedirect userRole={userRole} />
      {children}
    </div>
  )
}
