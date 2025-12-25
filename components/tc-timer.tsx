"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Trash2, RotateCcw, Pencil } from "lucide-react"
import type { TC } from "@/app/page"

interface TCTimerProps {
  tc: TC
  onDelete: () => void
  onRefill: (id: string, materialType?: string) => void
  onEdit: () => void
}

const MATERIAL_COLORS = {
  wood: "bg-amber-600",
  stone: "bg-gray-500",
  metal: "bg-zinc-400",
  armored: "bg-red-700",
}

const MATERIAL_LABELS = {
  wood: "Wood",
  stone: "Stone",
  metal: "Metal",
  armored: "Armored",
}

export function TCTimer({ tc, onDelete, onRefill, onEdit }: TCTimerProps) {
  const [materialStates, setMaterialStates] = useState<
    Record<string, { remaining: number; hoursLeft: number; percentage: number }>
  >({})

  useEffect(() => {
    const interval = setInterval(() => {
      const states: Record<string, { remaining: number; hoursLeft: number; percentage: number }> = {}

      Object.entries(tc.materials).forEach(([materialType, stock]) => {
        if (!stock) return

        const elapsed = Date.now() - stock.lastRefilled
        const daysElapsed = elapsed / (1000 * 60 * 60 * 24)
        const consumed = daysElapsed * stock.dailyUpkeep
        const remaining = Math.max(0, stock.amount - consumed)
        const hoursLeft = stock.dailyUpkeep > 0 ? (remaining / stock.dailyUpkeep) * 24 : 999
        const percentage = (remaining / stock.amount) * 100

        states[materialType] = { remaining, hoursLeft, percentage }
      })

      setMaterialStates(states)
    }, 1000)

    return () => clearInterval(interval)
  }, [tc])

  const formatTime = (hours: number) => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      const remainingHours = Math.floor(hours % 24)
      return `${days}d ${remainingHours}h`
    }
    const h = Math.floor(hours)
    const m = Math.floor((hours % 1) * 60)
    return `${h}h ${m}m`
  }

  const hasExpiredMaterial = Object.values(materialStates).some((state) => state.hoursLeft <= 0)
  const hasCriticalMaterial = Object.values(materialStates).some((state) => state.hoursLeft > 0 && state.hoursLeft <= 2)

  return (
    <Card className={`p-4 ${hasExpiredMaterial ? "border-destructive" : hasCriticalMaterial ? "border-primary" : ""}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-balance">{tc.name}</h3>
          <span className="text-xs text-muted-foreground">{Object.keys(tc.materials).length} materials tracked</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8" title="Edit TC">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRefill(tc.id)}
            className="h-8 w-8"
            title="Refill all materials"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(tc.materials).map(([materialType, stock]) => {
          const state = materialStates[materialType]
          if (!state) return null

          const isExpired = state.hoursLeft <= 0
          const isCritical = state.hoursLeft > 0 && state.hoursLeft <= 2

          return (
            <div key={materialType} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${MATERIAL_COLORS[materialType as keyof typeof MATERIAL_COLORS]}`}
                  />
                  <span className="text-sm font-medium">
                    {MATERIAL_LABELS[materialType as keyof typeof MATERIAL_LABELS]}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRefill(tc.id, materialType)}
                  className="h-6 text-xs px-2"
                >
                  Refill
                </Button>
              </div>
              <Progress
                value={state.percentage}
                className={`h-1.5 ${isExpired ? "[&>div]:bg-destructive" : isCritical ? "[&>div]:bg-primary" : "[&>div]:bg-accent"}`}
              />
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`font-mono font-semibold ${isExpired ? "text-destructive" : isCritical ? "text-primary" : "text-muted-foreground"}`}
                >
                  {isExpired ? "EMPTY" : formatTime(state.hoursLeft)}
                </span>
                <span className="text-muted-foreground">
                  {state.remaining.toFixed(0)} / {stock.amount}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {hasExpiredMaterial && (
        <div className="mt-3 text-xs text-destructive font-semibold bg-destructive/10 p-2 rounded">
          Materials depleted! Structures are decaying.
        </div>
      )}
      {hasCriticalMaterial && !hasExpiredMaterial && (
        <div className="mt-3 text-xs text-primary font-semibold bg-primary/10 p-2 rounded">
          Critical: Refill materials soon!
        </div>
      )}
    </Card>
  )
}
