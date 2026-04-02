export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-64 animate-fade-in">
      <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-xs text-muted-foreground mt-3">Carregando...</p>
    </div>
  );
}
