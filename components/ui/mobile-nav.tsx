"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "/sheets", label: "Sheets" },
  { href: "/templates", label: "Templates" },
  { href: "/banners", label: "Banners" },
  { href: "/analytics", label: "Analytics" },
  { href: "/production-manager", label: "Production Manager" },
  { href: "/work-log", label: "Work Log" },
  { href: "/team", label: "Team" },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 border-b bg-background shadow-lg">
          <nav className="container mx-auto flex flex-col px-4 py-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "py-3 text-sm border-b last:border-b-0 transition-colors",
                  pathname.startsWith(link.href)
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
            <form action="/api/auth/logout" method="POST" className="py-3">
              <Button type="submit" variant="ghost" size="sm" className="w-full justify-start px-0">
                Logout
              </Button>
            </form>
          </nav>
        </div>
      )}
    </div>
  )
}

