import clsx from "clsx";

export type ButtonVariant = "primary" | "accent" | "outline" | "whatsapp" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  accent: "bg-accent text-on-accent hover:bg-accent-hover",
  outline: "border border-line bg-surface text-primary hover:border-primary",
  whatsapp: "bg-whatsapp text-on-whatsapp hover:bg-whatsapp-hover",
  ghost: "text-primary hover:bg-primary-soft",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

/**
 * Shared button styling for <button>, <a> and locale-aware <Link>.
 * Keeping it a class helper avoids wrapping every link type.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return clsx(base, variants[variant], sizes[size], className);
}
