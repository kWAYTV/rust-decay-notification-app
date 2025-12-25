"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { TC } from "@/app/page"

interface AddTCDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (
    name: string,
    materials: {
      wood?: { amount: number; dailyUpkeep: number }
      stone?: { amount: number; dailyUpkeep: number }
      metal?: { amount: number; dailyUpkeep: number }
      armored?: { amount: number; dailyUpkeep: number }
    },
  ) => void
  editingTC?: TC
  onUpdate?: (
    id: string,
    name: string,
    materials: {
      wood?: { amount: number; dailyUpkeep: number }
      stone?: { amount: number; dailyUpkeep: number }
      metal?: { amount: number; dailyUpkeep: number }
      armored?: { amount: number; dailyUpkeep: number }
    },
  ) => void
}

export function AddTCDialog({ open, onOpenChange, onAdd, editingTC, onUpdate }: AddTCDialogProps) {
  const [name, setName] = useState("")
  const [enabledMaterials, setEnabledMaterials] = useState({
    wood: false,
    stone: true,
    metal: false,
    armored: false,
  })
  const [materialData, setMaterialData] = useState({
    wood: { amount: 1000, dailyUpkeep: 100 },
    stone: { amount: 2000, dailyUpkeep: 150 },
    metal: { amount: 1500, dailyUpkeep: 200 },
    armored: { amount: 1000, dailyUpkeep: 250 },
  })

  useEffect(() => {
    if (editingTC) {
      setName(editingTC.name)

      const enabled = {
        wood: !!editingTC.materials.wood,
        stone: !!editingTC.materials.stone,
        metal: !!editingTC.materials.metal,
        armored: !!editingTC.materials.armored,
      }
      setEnabledMaterials(enabled)

      const data = { ...materialData }
      Object.entries(editingTC.materials).forEach(([material, stock]) => {
        if (stock) {
          data[material as keyof typeof data] = {
            amount: stock.amount,
            dailyUpkeep: stock.dailyUpkeep,
          }
        }
      })
      setMaterialData(data)
    } else {
      setName("")
      setEnabledMaterials({ wood: false, stone: true, metal: false, armored: false })
    }
  }, [editingTC])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const materials: any = {}
    Object.entries(enabledMaterials).forEach(([material, enabled]) => {
      if (enabled) {
        materials[material] = materialData[material as keyof typeof materialData]
      }
    })

    if (Object.keys(materials).length === 0) return

    if (editingTC && onUpdate) {
      onUpdate(editingTC.id, name.trim(), materials)
    } else {
      onAdd(name.trim(), materials)
    }

    setName("")
    setEnabledMaterials({ wood: false, stone: true, metal: false, armored: false })
  }

  const updateMaterial = (material: keyof typeof materialData, field: "amount" | "dailyUpkeep", value: string) => {
    const numValue = Math.max(0, Number.parseInt(value) || 0)
    setMaterialData({
      ...materialData,
      [material]: { ...materialData[material], [field]: numValue },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTC ? "Edit Tool Cupboard" : "Add Tool Cupboard"}</DialogTitle>
          <DialogDescription>
            Check your TC in-game and enter the amount stored and 24-hour upkeep cost for each material
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">TC Name</Label>
            <Input
              id="name"
              placeholder="e.g., North Wall, Main Base, Quarry"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Materials (select at least one)</Label>

            {(["wood", "stone", "metal", "armored"] as const).map((material) => (
              <div key={material} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={material}
                    checked={enabledMaterials[material]}
                    onCheckedChange={(checked) =>
                      setEnabledMaterials({ ...enabledMaterials, [material]: checked as boolean })
                    }
                  />
                  <Label htmlFor={material} className="capitalize cursor-pointer font-semibold">
                    {material}
                  </Label>
                </div>

                {enabledMaterials[material] && (
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    <div className="space-y-1">
                      <Label htmlFor={`${material}-amount`} className="text-xs">
                        Amount Stored
                      </Label>
                      <Input
                        id={`${material}-amount`}
                        type="number"
                        min="0"
                        value={materialData[material].amount}
                        onChange={(e) => updateMaterial(material, "amount", e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`${material}-upkeep`} className="text-xs">
                        Daily Upkeep
                      </Label>
                      <Input
                        id={`${material}-upkeep`}
                        type="number"
                        min="0"
                        value={materialData[material].dailyUpkeep}
                        onChange={(e) => updateMaterial(material, "dailyUpkeep", e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editingTC ? "Update TC" : "Add TC"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
