import { FileX } from 'lucide-react';

export default function EmptyState({ icon: Icon = FileX, title = 'Nenhum registro', description, colSpan }) {
  const content = (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-muted-foreground/60" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground/60 mt-1">{description}</p>}
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
