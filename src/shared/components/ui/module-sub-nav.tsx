import { cn } from "./utils";

type ModuleSubNavProps = {
  title: string;
  icon?: React.ReactNode;
  iconContainerClassName?: string;
  className?: string;
};

export function ModuleSubNav({ title, icon, iconContainerClassName, className }: ModuleSubNavProps) {
  return (
    <div className={cn("shrink-0 px-6 lg:px-8 py-3 bg-transparent border-b border-gray-dark", className)}>
      <div className="flex items-center gap-3">
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
        <h2 className="text-xl lg:text-2xl font-bold text-white-primary leading-tight">{title}</h2>
      </div>
    </div>
  );
}
