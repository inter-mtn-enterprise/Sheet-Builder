"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

export function WorkerRedirect({ userRole }: { userRole: string | null }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (userRole === "worker" && pathname !== "/work-log") {
      router.replace("/work-log")
    }
  }, [userRole, pathname, router])

  return null
}

