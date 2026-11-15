import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonCva = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        clay: "bg-clay text-clay-foreground hover:brightness-95",
        outline: "border border-border bg-card text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        danger: "bg-danger text-white hover:brightness-95",
        link: "text-primary underline-offset-4 hover:underline px-0 min-h-0",
      },
      size: {
        md: "min-h-12 px-5 text-base",
        sm: "min-h-10 px-3 text-sm",
        lg: "min-h-14 px-6 text-lg",
        icon: "size-12",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

/** Merged with tailwind-merge so a passed `className` (e.g. "hidden sm:inline-flex") overrides the base classes. */
export const buttonVariants = (props?: Parameters<typeof buttonCva>[0]) => cn(buttonCva(props));

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonCva>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
