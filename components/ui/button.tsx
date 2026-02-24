import React from "react";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "outline", size = "md", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantStyles = {
      default: "bg-black dark:bg-white text-white dark:text-black border border-black dark:border-gray-200 hover:bg-gray-900 dark:hover:bg-gray-100",
      outline: "border border-black dark:border-gray-400 text-black dark:text-gray-100 hover:bg-surface dark:hover:bg-gray-800",
      ghost: "text-black dark:text-gray-100 hover:bg-surface dark:hover:bg-gray-800",
    };

    const sizeStyles = {
      sm: "px-2 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm",
      md: "px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base min-h-10 sm:min-h-auto",
      lg: "px-4 sm:px-6 py-3 sm:py-3 text-base sm:text-lg",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
          className || ""
        }`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
