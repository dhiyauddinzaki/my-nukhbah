import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonStyles = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary disabled:opacity-55",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:brightness-110",
        outline: "border border-border bg-card text-foreground hover:bg-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Button({
  asChild,
  className,
  variant,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonStyles> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonStyles({ variant }), className)} {...props} />;
}
