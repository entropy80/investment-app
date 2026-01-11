"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface EditableCellProps {
  value: number
  onChange: (value: number) => Promise<void>
  disabled?: boolean
  className?: string
  formatValue?: (value: number) => string
}

export function EditableCell({
  value,
  onChange,
  disabled = false,
  className,
  formatValue = (v) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value.toString())
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Update local value when prop changes (but not while editing)
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value.toString())
    }
  }, [value, isEditing])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleClick = () => {
    if (!disabled) {
      setIsEditing(true)
    }
  }

  const handleSave = useCallback(async () => {
    const newValue = parseFloat(localValue) || 0
    if (newValue !== value) {
      setSaving(true)
      try {
        await onChange(newValue)
      } catch (error) {
        console.error("Failed to save:", error)
        setLocalValue(value.toString())
      } finally {
        setSaving(false)
      }
    }
    setIsEditing(false)
  }, [localValue, value, onChange])

  const handleBlur = () => {
    // Clear any pending debounce
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    handleSave()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      setLocalValue(value.toString())
      setIsEditing(false)
    } else if (e.key === "Tab") {
      handleSave()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers, decimal point, and empty string
    const newValue = e.target.value
    if (newValue === "" || /^[\d.]*$/.test(newValue)) {
      setLocalValue(newValue)
    }
  }

  if (isEditing) {
    return (
      <div className={cn("relative", className)}>
        <Input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="h-7 w-full px-2 text-right text-sm"
          disabled={saving}
        />
        {saving && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "px-2 py-1 text-right text-sm cursor-pointer hover:bg-muted/50 rounded transition-colors min-h-[28px]",
        disabled && "cursor-not-allowed opacity-50",
        value === 0 && "text-muted-foreground",
        className
      )}
    >
      {value === 0 ? "-" : formatValue(value)}
    </div>
  )
}
