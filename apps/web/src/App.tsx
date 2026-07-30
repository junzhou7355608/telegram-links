import { Toaster } from '@repo/ui/components/sonner';
import { TooltipProvider } from '@repo/ui/components/tooltip';
import { LinkWorkspace } from '@/components/link-workspace';
import './App.css';

function App() {
  return (
    <TooltipProvider>
      <a
        href="#link-results"
        className="fixed top-3 left-3 z-50 -translate-y-20 rounded-lg bg-foreground px-3 py-2 text-sm text-background transition-transform focus:translate-y-0"
      >
        跳到链接列表
      </a>
      <LinkWorkspace />
      <Toaster position="top-center" />
    </TooltipProvider>
  );
}

export default App;
