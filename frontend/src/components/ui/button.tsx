import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-primary/25 hover:bg-[hsl(var(--primary-hover))]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[hsl(var(--secondary-hover))]",
        success:
          "bg-success text-success-foreground shadow-green-500/25 hover:bg-[hsl(var(--success-hover))]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-red-500/25 hover:bg-[hsl(var(--destructive-hover))]",
        warning:
          "bg-warning text-warning-foreground shadow-warning/40 hover:bg-[hsl(var(--warning-hover))]",
        ghost:
          "text-muted-foreground hover:bg-secondary",
        outline:
          "border border-input bg-transparent text-foreground hover:bg-muted",
      },
      size: {
        xs: "py-1 px-2.5 text-xs",
        sm: "py-1.5 px-3 text-sm",
        md: "py-2 px-4 text-sm",
        lg: "py-2.5 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
