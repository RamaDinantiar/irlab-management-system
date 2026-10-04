import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/40 focus-visible:ring-[3px] focus-visible:ring-offset-1 aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Figma: "Simpan Laporan", "Mulai Mode Tinjauan". Sengaja primary-700, bukan
        // primary (#1a86a0): teks putih di atas #1a86a0 hanya 4.2:1 (< WCAG AA 4.5:1).
        default:
          "bg-primary-700 text-white hover:bg-primary-900",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30",
        // Figma: "Batal", "Export CSV", "Urutkan"
        outline:
          "border border-input bg-white text-foreground hover:bg-primary-50 hover:text-primary-700",
        // Figma: "Simpan Seluruh Nilai" di atas bar gelap
        secondary:
          "bg-primary-200 text-primary-900 hover:bg-primary-50",
        ghost: "hover:bg-primary-50 hover:text-primary-700",
        link: "text-primary-700 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 has-[>svg]:px-3",
        sm: "h-8 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-12 px-6 text-base has-[>svg]:px-4",
        icon: "size-10",
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
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
