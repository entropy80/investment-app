"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"

interface UserRoleSelectProps {
  userId: string
  currentRole: string
  disabled?: boolean
}

export function UserRoleSelect({ userId, currentRole, disabled }: UserRoleSelectProps) {
  const [role, setRole] = useState(currentRole)
  const [isLoading, setIsLoading] = useState(false)

  const handleRoleChange = async (newRole: string) => {
    if (newRole === role || disabled) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/users/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (response.ok) {
        setRole(newRole)
      } else {
        const data = await response.json()
        alert(data.error || "Failed to update role")
      }
    } catch (error) {
      alert("Failed to update role")
    } finally {
      setIsLoading(false)
    }
  }

  if (disabled) {
    return (
      <Badge variant={role === "ADMIN" || role === "SUPER_ADMIN" ? "default" : "secondary"}>
        {role}
      </Badge>
    )
  }

  return (
    <select
      value={role}
      onChange={(e) => handleRoleChange(e.target.value)}
      disabled={isLoading}
      className="px-2 py-1 text-sm border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
    >
      <option value="USER">USER</option>
      <option value="ADMIN">ADMIN</option>
      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
    </select>
  )
}
