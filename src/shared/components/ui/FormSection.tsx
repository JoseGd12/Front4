import React from "react";
import { LucideIcon } from "lucide-react";

interface FormSectionProps {
  title: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}

export function FormSection({
  title,
  icon: Icon,
  children,
  className = "",
  headerRight,
}: FormSectionProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-white-primary flex items-center gap-2 leading-snug">
          {Icon && <Icon className="w-4 h-4 text-orange-primary" />}
          {title}
        </h3>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>
      {children}
    </div>
  );
}
