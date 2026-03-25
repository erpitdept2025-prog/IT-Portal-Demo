"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { ShieldAlert } from "lucide-react"
import { toast } from "sonner"

interface DuplicateDetail {
  type: "within" | "across"
  matchedWith: number[]
}

export interface AuditResult {
  issues: any[]
  duplicates: Set<number>
  duplicateDetails: Map<number, DuplicateDetail>
  missingTypeCount: number
  missingStatusCount: number
  duplicateCount: number
  totalIssues: number
}

interface AuditProps<T> {
  customers: T[]
  setAuditedAction: React.Dispatch<React.SetStateAction<T[]>>
  setDuplicateIdsAction: React.Dispatch<React.SetStateAction<Set<number>>>
  setIsAuditViewAction: React.Dispatch<React.SetStateAction<boolean>>
  setDuplicateDetailsAction?: React.Dispatch<React.SetStateAction<Map<number, DuplicateDetail>>>
  onAuditComplete?: (result: AuditResult) => void
}

/**
 * 🔍 Audit component (reusable + enhanced duplicate detection)
 * Detects duplicates within same TSA and across different TSAs with terminal-style console output
 */
export function Audit<T extends { id: number; company_name?: string; contact_number?: string; contact_person?: string; type_client?: string; status?: string; referenceid?: string }>({
  customers,
  setAuditedAction,
  setDuplicateIdsAction,
  setIsAuditViewAction,
  setDuplicateDetailsAction,
  onAuditComplete,
}: AuditProps<T>) {
  const handleAudit = () => {
    // Terminal-style console output
    console.clear()
    console.log(
      "%c[AUDIT] Starting database audit...",
      "color: #00ff00; font-weight: bold; font-family: monospace"
    )

    const duplicates = new Set<number>()
    const duplicateDetails = new Map<number, DuplicateDetail>()

    // Group customers by TSA (referenceid)
    const byTSA = new Map<string, typeof customers>()
    customers.forEach((c) => {
      const tsaId = c.referenceid || "unknown"
      if (!byTSA.has(tsaId)) byTSA.set(tsaId, [])
      byTSA.get(tsaId)!.push(c)
    })

    console.log(
      `%c[AUDIT] Found ${byTSA.size} TSA(s) with ${customers.length} total customers`,
      "color: #00ffff; font-family: monospace"
    )

    // Detect duplicates within same TSA
    let withinDuplicateCount = 0
    byTSA.forEach((tsaCustomers, tsaId) => {
      const seenInTSA = new Map<string, number>()
      tsaCustomers.forEach((c) => {
        const key = `${c.company_name?.trim().toLowerCase()}|${c.contact_number?.trim()}|${c.contact_person
          ?.trim()
          .toLowerCase()}`
        if (seenInTSA.has(key)) {
          const matchedId = seenInTSA.get(key)!
          duplicates.add(matchedId)
          duplicates.add(c.id)

          if (!duplicateDetails.has(c.id)) {
            duplicateDetails.set(c.id, { type: "within", matchedWith: [matchedId] })
          } else {
            const detail = duplicateDetails.get(c.id)!
            detail.matchedWith.push(matchedId)
          }

          withinDuplicateCount++
          console.log(
            `%c[AUDIT] Within TSA ${tsaId}: Duplicate found - ${c.company_name} (ID: ${c.id})`,
            "color: #ffaa00; font-family: monospace"
          )
        } else {
          seenInTSA.set(key, c.id)
        }
      })
    })

    // Detect duplicates across different TSAs
    let acrossDuplicateCount = 0
    customers.forEach((c) => {
      const key = `${c.company_name?.trim().toLowerCase()}|${c.contact_number?.trim()}|${c.contact_person
        ?.trim()
        .toLowerCase()}`

      for (const [otherTSA, otherCustomers] of byTSA) {
        if (otherTSA === (c.referenceid || "unknown")) continue

        const matchedInOtherTSA = otherCustomers.find(
          (oc) =>
            `${oc.company_name?.trim().toLowerCase()}|${oc.contact_number?.trim()}|${oc.contact_person
              ?.trim()
              .toLowerCase()}` === key
        )

        if (matchedInOtherTSA) {
          duplicates.add(c.id)
          duplicates.add(matchedInOtherTSA.id)

          if (!duplicateDetails.has(c.id)) {
            duplicateDetails.set(c.id, { type: "across", matchedWith: [matchedInOtherTSA.id] })
          } else {
            const detail = duplicateDetails.get(c.id)!
            detail.matchedWith.push(matchedInOtherTSA.id)
            detail.type = "across"
          }

          acrossDuplicateCount++
          console.log(
            `%c[AUDIT] Across TSAs: Duplicate found - ${c.company_name} (ID: ${c.id} in TSA ${c.referenceid}) matches ID ${matchedInOtherTSA.id}`,
            "color: #ff0000; font-family: monospace"
          )
        }
      }
    })

    const issues = customers.filter(
      (c) => !c.type_client?.trim() || !c.status?.trim() || duplicates.has(c.id)
    )

    const missingTypeCount = customers.filter((c) => !c.type_client?.trim()).length
    const missingStatusCount = customers.filter((c) => !c.status?.trim()).length

    console.log(
      `%c[AUDIT] Summary: ${withinDuplicateCount} within-TSA duplicates, ${acrossDuplicateCount} across-TSA duplicates, ${issues.length} total issues`,
      "color: #00ff00; font-weight: bold; font-family: monospace"
    )
    console.log(
      "%c[AUDIT] Audit completed successfully!",
      "color: #00ff00; font-weight: bold; font-family: monospace"
    )

    toast.loading("Auditing database...")
    setTimeout(() => {
      toast.success("Audit completed successfully!")
    }, 800)

    const auditResult: AuditResult = {
      issues,
      duplicates,
      duplicateDetails,
      missingTypeCount,
      missingStatusCount,
      duplicateCount: duplicates.size,
      totalIssues: issues.length,
    }

    setAuditedAction(issues)
    setDuplicateIdsAction(duplicates)
    setDuplicateDetailsAction?.(duplicateDetails)
    // Pass the audit result to parent, which will handle showing the dialog
    onAuditComplete?.(auditResult)
  }

  return (
    <Button variant="destructive" onClick={handleAudit}>
      <ShieldAlert className="size-4 mr-1" /> Audit
    </Button>
  )
}
