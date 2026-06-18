import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#EDE9E3] text-[#1A1A1A]",
        ai: "bg-[#7C5CFC]/10 text-[#7C5CFC]",
        booked: "bg-[#4A7C59]/10 text-[#4A7C59]",
        warning: "bg-[#D4A04A]/10 text-[#D4A04A]",
        destructive: "bg-[#C44E4E]/10 text-[#C44E4E]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
