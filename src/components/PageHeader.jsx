export default function PageHeader({ title, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 sm:mb-8">
      <div className="space-y-1 min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}
