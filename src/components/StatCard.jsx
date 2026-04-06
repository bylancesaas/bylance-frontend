export default function StatCard({ title, value, icon: Icon, description, className = '' }) {
  return (
    <div className={`bg-card rounded-xl border shadow-card p-5 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 leading-none pt-0.5">{title}</p>
        {Icon && (
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-[18px] h-[18px] text-primary" />
          </div>
        )}
      </div>
      <p className="text-2xl font-black tracking-tight text-foreground">{value}</p>
      {description && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{description}</p>}
    </div>
  );
}
