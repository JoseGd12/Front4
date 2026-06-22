import { cn } from "./utils";
import { ArrowLeft } from "lucide-react";

type ModuleSubNavProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconContainerClassName?: string;
  className?: string;
  onBack?: () => void;
  backTitle?: string;
  rightContent?: React.ReactNode;
};

export function ModuleSubNav({
  title,
  subtitle,
  icon,
  iconContainerClassName,
  className,
  onBack,
  backTitle = "Volver",
  rightContent,
}: ModuleSubNavProps) {
  return (
    <div className={cn("shrink-0 px-6 lg:px-8 py-3 bg-transparent border-b border-gray-dark", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              title={backTitle}
              className="p-2 rounded-lg hover:bg-gray-dark text-gray-lightest hover:text-white-primary transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : null}
          {icon ? (
            <div
              className={cn(
                "w-10 h-10 rounded-xl bg-gray-darkest flex items-center justify-center shrink-0",
                iconContainerClassName
              )}
            >
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-xl lg:text-2xl font-bold text-white-primary leading-tight truncate">{title}</h2>
            {subtitle ? (
              <p className="text-xs lg:text-sm text-gray-lighter leading-tight mt-1 truncate">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {rightContent ? (
          <div className="shrink-0">{rightContent}</div>
        ) : null}
      </div>
    </div>
  );
}
