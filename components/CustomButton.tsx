"use client";

import React from "react";

export type ButtonVariant = "primary" | "outline" | "active" | "disabled";

export interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children?: React.ReactNode;
  fullWidth?: boolean;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  variant = "primary",
  children = "Button",
  fullWidth = true,
  disabled = false,
  className = "",
  ...props
}) => {
  const isButtonDisabled = disabled || variant === "disabled";

  const getVariantStyles = () => {
    if (isButtonDisabled) {
      return "cursor-not-allowed border border-transparent bg-[#DCE7F3] text-[#7890AA] shadow-none";
    }

    switch (variant) {
      case "outline":
        return "border border-[#0C68D5] bg-white text-[#0C68D5] shadow-sm hover:bg-[#EAF2FC] active:scale-[0.98]";
      case "active":
        return "border border-transparent bg-[#0B2548] text-white shadow-md shadow-[#0B2548]/20 hover:bg-[#061a35] active:scale-[0.98]";
      case "primary":
      default:
        return "border border-transparent bg-[#0C68D5] text-white shadow-md shadow-[#0C68D5]/20 hover:bg-[#0753AD] active:bg-[#0753AD] active:scale-[0.98]";
    }
  };

  return (
    <button
      disabled={isButtonDisabled}
      className={`min-h-10 px-4 rounded-lg font-bold text-sm tracking-wide transition-all duration-150 flex items-center justify-center select-none focus-visible:outline-none ${
        fullWidth ? "w-full" : "w-auto"
      } ${getVariantStyles()} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default CustomButton;
