"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors outline-none",
        "border-2 border-transparent",
        "focus-visible:ring-2 focus-visible:ring-emerald-500/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{
        backgroundColor: props.checked ? '#10b981' : '#4b5563',
      }}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md transition-transform"
        style={{
          transform: props.checked ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
