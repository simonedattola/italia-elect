export function PageHeader({ title }: { title: string }) {
  return (
    <h1 className="mb-8 text-2xl font-semibold tracking-tight text-white sm:mb-10 sm:text-3xl">
      {title}
    </h1>
  );
}

export function PageShell({
  children,
  narrow = false,
}: {
  children: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <div
      className={
        narrow
          ? "mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10"
          : "mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:max-w-4xl"
      }
    >
      {children}
    </div>
  );
}
