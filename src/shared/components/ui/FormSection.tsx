import React from "react";
import { LucideIcon } from "lucide-react";

interface FormSectionProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, icon: Icon, children, className = "" }: FormSectionProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-base font-semibold text-white-primary flex items-center gap-2 leading-snug">
        {Icon && <Icon className="w-4 h-4 text-orange-primary" />}
        {title}
      </h3>
      {children}
    </div>
  );
}
