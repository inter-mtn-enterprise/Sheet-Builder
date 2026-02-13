"use client"

import { useRef, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { VChart } from "@visactor/react-vchart"

interface ChartCardProps {
  title: string
  description?: string
  spec: Record<string, any> | null
  loading?: boolean
  height?: number
  className?: string
}

export function ChartCard({
  title,
  description,
  spec,
  loading = false,
  height = 300,
  className,
}: ChartCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    observer.observe(containerRef.current)
    // Set initial width
    setContainerWidth(containerRef.current.clientWidth)

    return () => observer.disconnect()
  }, [])

  const responsiveSpec = spec
    ? {
        ...spec,
        width: containerWidth > 0 ? containerWidth : undefined,
        height,
        autoFit: true,
      }
    : null

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div ref={containerRef} style={{ width: "100%", height }}>
          {loading || !responsiveSpec ? (
            <Skeleton className="w-full h-full rounded-md" />
          ) : (
            <VChart spec={responsiveSpec} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

