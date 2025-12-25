"use client"

import { useState, useEffect } from "react"
import { TCTimer } from "@/components/tc-timer"
import { AddTCDialog } from "@/components/add-tc-dialog"
import { Button } from "@/components/ui/button"
import { Plus, Bell, BellOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

export interface MaterialStock {
  amount: number // Amount stored in TC
  dailyUpkeep: number // Daily consumption rate
  lastRefilled: number // Timestamp when refilled
}

export interface TC {
  id: string
  name: string
  materials: {
    wood?: MaterialStock
    stone?: MaterialStock
    metal?: MaterialStock
    armored?: MaterialStock
  }
  notifiedMaterials: Set<string> // Track which materials have been notified
}

export default function Home() {
  const [tcs, setTcs] = useState<TC[]>([])
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTC, setEditingTC] = useState<TC | undefined>(undefined)
  const { toast } = useToast()

  useEffect(() => {
    const stored = localStorage.getItem("rust-tcs-v2")
    if (stored) {
      const parsed = JSON.parse(stored)
      setTcs(
        parsed.map((tc: any) => ({
          ...tc,
          notifiedMaterials: new Set(tc.notifiedMaterials || []),
        })),
      )
    }

    if ("Notification" in window && Notification.permission === "granted") {
      setNotificationsEnabled(true)
    }
  }, [])

  useEffect(() => {
    const toStore = tcs.map((tc) => ({
      ...tc,
      notifiedMaterials: Array.from(tc.notifiedMaterials),
    }))
    localStorage.setItem("rust-tcs-v2", JSON.stringify(toStore))
  }, [tcs])

  useEffect(() => {
    const interval = setInterval(() => {
      setTcs((prevTcs) =>
        prevTcs.map((tc) => {
          let updated = false
          const newNotified = new Set(tc.notifiedMaterials)

          Object.entries(tc.materials).forEach(([materialType, stock]) => {
            if (!stock) return

            const elapsed = Date.now() - stock.lastRefilled
            const daysElapsed = elapsed / (1000 * 60 * 60 * 24)
            const consumed = daysElapsed * stock.dailyUpkeep
            const remaining = stock.amount - consumed
            const hoursLeft = (remaining / stock.dailyUpkeep) * 24

            // Notify when less than 2 hours left
            if (hoursLeft <= 2 && hoursLeft > 0 && !newNotified.has(materialType) && notificationsEnabled) {
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification(`TC Alert: ${tc.name}`, {
                  body: `${materialType.toUpperCase()} will run out in ${hoursLeft.toFixed(1)} hours!`,
                  icon: "/icon.svg",
                })
              }

              toast({
                title: `TC Alert: ${tc.name}`,
                description: `${materialType.toUpperCase()} needs refilling soon!`,
                variant: "destructive",
              })

              newNotified.add(materialType)
              updated = true
            }
          })

          return updated ? { ...tc, notifiedMaterials: newNotified } : tc
        }),
      )
    }, 10000)

    return () => clearInterval(interval)
  }, [notificationsEnabled, toast])

  const addTC = (
    name: string,
    materials: {
      wood?: { amount: number; dailyUpkeep: number }
      stone?: { amount: number; dailyUpkeep: number }
      metal?: { amount: number; dailyUpkeep: number }
      armored?: { amount: number; dailyUpkeep: number }
    },
  ) => {
    const now = Date.now()
    const newTC: TC = {
      id: now.toString(),
      name,
      materials: Object.fromEntries(
        Object.entries(materials)
          .filter(([_, stock]) => stock !== undefined)
          .map(([type, stock]) => [
            type,
            {
              amount: stock!.amount,
              dailyUpkeep: stock!.dailyUpkeep,
              lastRefilled: now,
            },
          ]),
      ),
      notifiedMaterials: new Set(),
    }
    setTcs([...tcs, newTC])
    setIsDialogOpen(false)
  }

  const updateTC = (
    id: string,
    name: string,
    materials: {
      wood?: { amount: number; dailyUpkeep: number }
      stone?: { amount: number; dailyUpkeep: number }
      metal?: { amount: number; dailyUpkeep: number }
      armored?: { amount: number; dailyUpkeep: number }
    },
  ) => {
    const now = Date.now()
    setTcs(
      tcs.map((tc) =>
        tc.id === id
          ? {
              ...tc,
              name,
              materials: Object.fromEntries(
                Object.entries(materials)
                  .filter(([_, stock]) => stock !== undefined)
                  .map(([type, stock]) => [
                    type,
                    {
                      amount: stock!.amount,
                      dailyUpkeep: stock!.dailyUpkeep,
                      lastRefilled: now,
                    },
                  ]),
              ),
              notifiedMaterials: new Set(),
            }
          : tc,
      ),
    )
    setEditingTC(undefined)
    setIsDialogOpen(false)
  }

  const deleteTC = (id: string) => {
    setTcs(tcs.filter((tc) => tc.id !== id))
  }

  const refillMaterial = (id: string, materialType?: string) => {
    setTcs(
      tcs.map((tc) => {
        if (tc.id !== id) return tc

        const newNotified = new Set(tc.notifiedMaterials)
        if (materialType) {
          newNotified.delete(materialType)
        } else {
          newNotified.clear()
        }

        return {
          ...tc,
          materials: Object.fromEntries(
            Object.entries(tc.materials).map(([type, stock]) => [
              type,
              materialType === undefined || type === materialType ? { ...stock, lastRefilled: Date.now() } : stock,
            ]),
          ),
          notifiedMaterials: newNotified,
        }
      }),
    )
  }

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        setNotificationsEnabled(true)
        toast({
          title: "Notifications Enabled",
          description: "You will receive alerts when materials run low.",
        })
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-primary text-balance">Rust TC Upkeep Timer</h1>
            <p className="mt-2 text-muted-foreground">Track your Tool Cupboards with real upkeep calculations</p>
          </div>
          <div className="flex gap-2">
            {!notificationsEnabled && (
              <Button onClick={requestNotificationPermission} variant="outline" size="lg">
                <BellOff className="mr-2 h-5 w-5" />
                Enable Alerts
              </Button>
            )}
            {notificationsEnabled && (
              <Button variant="outline" size="lg" disabled>
                <Bell className="mr-2 h-5 w-5" />
                Alerts On
              </Button>
            )}
            <Button onClick={() => setIsDialogOpen(true)} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Add TC
            </Button>
          </div>
        </div>

        {tcs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-lg border-2 border-dashed border-border p-12 max-w-md">
              <h3 className="text-xl font-semibold mb-2">No TCs Tracked</h3>
              <p className="text-muted-foreground mb-4">
                Add your first TC with material amounts and daily upkeep costs
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First TC
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tcs.map((tc) => (
              <TCTimer
                key={tc.id}
                tc={tc}
                onDelete={() => deleteTC(tc.id)}
                onRefill={refillMaterial}
                onEdit={() => {
                  setEditingTC(tc)
                  setIsDialogOpen(true)
                }}
              />
            ))}
          </div>
        )}

        <div className="mt-12 rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Each TC can contain multiple materials (wood, stone, metal, armored). Each material decays independently
              based on your daily upkeep cost.
            </p>
            <p>
              To find your daily upkeep: hover over the text in your TC in-game. Enter the amount stored and the 24-hour
              upkeep cost for each material.
            </p>
            <p className="font-semibold text-foreground">
              You'll receive notifications when materials are running low (less than 2 hours remaining).
            </p>
          </div>
        </div>
      </div>

      <AddTCDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setEditingTC(undefined)
        }}
        onAdd={addTC}
        editingTC={editingTC}
        onUpdate={updateTC}
      />
    </div>
  )
}
