import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface NannyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'accent';
}

export const NannyButton = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}: NannyButtonProps) => {
  const baseStyle = "px-6 py-3 rounded-full font-bold transition-all transform hover:scale-105 shadow-md flex items-center justify-center gap-2 cursor-pointer";
  
  const variants = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-white border-2 border-gray-100 text-gray-700 hover:bg-gray-50",
    outline: "border-2 border-white text-white hover:bg-white/10",
    accent: "bg-salmon text-white hover:opacity-90"
  };

  return (
    <button 
      className={cn(baseStyle, variants[variant], className)} 
      {...props}
    >
      {children}
    </button>
  );
};
