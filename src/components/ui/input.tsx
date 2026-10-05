import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-ink placeholder:text-muted-white selection:bg-lime selection:text-ink border-ink h-10 w-full min-w-0 rounded-[10px] border-2 bg-white text-ink px-3 py-1 text-base font-semibold transition-[box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:shadow-ext-sm",
        "aria-invalid:border-alert-white aria-invalid:shadow-[3px_3px_0_var(--color-alert-white)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
