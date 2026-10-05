import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Azul Bloque buttons (section 1.6, 7): hard extrusion, pushed-in pressed
// state, display face. `default` is THE lime action of a view (one per
// view); `secondary` is the white extruded chip ("+ CREAR EVENTO");
// `outline` follows the surface's foreground; `destructive` is the alert
// OUTLINE ("CERRAR AHORA"), never a filled red block.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] text-sm font-extrabold [font-stretch:108%] uppercase tracking-[0.01em] transition-[transform,box-shadow,background-color] duration-75 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-lime text-ink border-2 border-ink shadow-ext-md hover:brightness-105 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        destructive:
          "bg-transparent text-destructive border-2 border-destructive hover:bg-destructive/10 active:translate-x-[2px] active:translate-y-[2px]",
        outline:
          "bg-transparent text-foreground border-2 border-current hover:bg-accent active:translate-x-[2px] active:translate-y-[2px]",
        secondary:
          "bg-white text-ink border-2 border-ink shadow-ext-sm hover:bg-line-white active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        ghost:
          "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-foreground normal-case underline underline-offset-4 decoration-2 hover:decoration-lime",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        xs: "h-7 gap-1 rounded-[8px] px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 rounded-[10px] gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-[14px] px-6 text-base has-[>svg]:px-4",
        icon: "size-10",
        "icon-xs": "size-7 rounded-[8px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
