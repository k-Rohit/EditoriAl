const AppFooter = () => (
  <footer className="border-t border-border py-5 px-4 sm:px-8">
    <div className="max-w-5xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <img src="/icon.png" alt="EditoriAI" className="w-4 h-4 rounded" />
        EditoriAI
      </div>
      <p className="text-[10px] sm:text-xs text-muted-foreground/50">
        AI-powered news intelligence
      </p>
    </div>
  </footer>
);

export default AppFooter;
