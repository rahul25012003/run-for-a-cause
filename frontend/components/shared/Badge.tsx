import { cn } from "@/lib/utils";

const variantStyles = {
  default: "bg-ink-100 text-ink-700",
  primary: "bg-primary-100 text-primary-700",
  success: "bg-secondary-100 text-secondary-700",
  warning: "bg-gold-100 text-gold-600",
  danger: "bg-danger-50 text-danger-600",
  outline: "bg-transparent border border-ink-200 text-ink-700",
} as const;

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variantStyles;
  className?: string;
}): React.ReactNode {
  return <span className={cn("chip", variantStyles[variant], className)}>{children}</span>;
}
