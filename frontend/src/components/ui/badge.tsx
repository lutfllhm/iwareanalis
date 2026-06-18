import * as React from "react"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success"
}

function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  const variantClasses: Record<string, string> = {
    default:
      "border-transparent bg-primary text-primary-foreground",
    secondary:
      "border-transparent bg-secondary text-secondary-foreground",
    destructive:
      "border-transparent bg-destructive text-destructive-foreground",
    outline: "text-foreground",
    success:
      "border-transparent bg-success text-success-foreground",
  }

  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantClasses[variant] || variantClasses.default} ${className}`}
      {...props}
    />
  )
}

export { Badge }
export type { BadgeProps }
