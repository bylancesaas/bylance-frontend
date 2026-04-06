import { FileX } from 'lucide-react';

export default function EmptyState({ icon: Icon = FileX, title = 'Nenhum registro', description, colSpan }) {
  const content = (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-primary/50" />
      </div>
      <p className="text-sm font-semibold text-foreground/70">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>}
    </div>
  );

  if (colSpan) {
    return (
      <tr>
        <td colSpan={colSpan}>{content}</td>
      </tr>
    );
  }

  return content;
}
