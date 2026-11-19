import { Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";

/** Renders a lazy component with a quiet placeholder, so heavy chunks load without layout jumps. */
export function Lazy<P extends object>({
  view,
  fallback,
  ...props
}: { view: LazyExoticComponent<ComponentType<P>>; fallback?: ReactNode } & P) {
  const View = view as unknown as ComponentType<object>;
  return (
    <Suspense fallback={fallback ?? <div className="skeleton" aria-busy="true" />}>
      <View {...props} />
    </Suspense>
  );
}
