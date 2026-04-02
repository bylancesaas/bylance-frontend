export default function StatCard({ title, value, icon: Icon, description, className = '' }) {
  return (
    <div className={`bg-card rounded-xl border shadow-card p-5 transition-all hover:shadow-elevated ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
        {Icon && (
          <div className="h-9 w-9 rounded-lg bg-primary/8 flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-primary" />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {description && <p className="text-xs text-muted-foreground mt-1.5">{description}</p>}
    </div>
  );
}
