import React from "react";

interface FormSectionProps {
  title: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}

export function FormSection({
  title,
  icon,
  children,
  className = "",
  headerRight,
}: FormSectionProps) {
  return (
    <div className={`space-y-3 py-4 first:pt-0 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-white-primary flex items-center gap-2 leading-snug">
          {icon}
          {title}
        </h3>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>
      {children}
    </div>
  );
}
