import { AdminWorkspace } from '@/components/admin-workspace';
import { Toaster } from '@repo/ui/components/sonner';
import { TooltipProvider } from '@repo/ui/components/tooltip';
import './App.css';

function App() {
  return (
    <TooltipProvider>
      <a
        href="#admin-content"
        className="fixed top-3 left-3 z-50 -translate-y-20 rounded-lg bg-foreground px-3 py-2 text-sm text-background transition-transform focus:translate-y-0"
      >
        跳到主要内容
      </a>
      <AdminWorkspace />
      <Toaster position="top-center" />
    </TooltipProvider>
  );
}

export default App;
