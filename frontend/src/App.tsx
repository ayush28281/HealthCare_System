import * as React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

import { Toaster } from "@/components/ui/toaster";       // ✅ Correct Shadcn toaster provider
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Pages
import Index from "./pages/index";
import NotFound from "./pages/NotFound";
import HistoryPage from "./pages/History";

// Theme Toggle
import ThemeToggle from "@/components/ui/ThemeToggle";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        
        {/* GLOBAL TOAST PROVIDERS */}
        <Toaster />     {/*  Correct toast provider */}
        <Sonner />      {/* Optional extra toast system */}

        <BrowserRouter>

          {/* TOP NAVBAR */}
          <header className="w-full bg-card border-b border-border px-6 py-3 flex items-center justify-between">
            <nav className="flex items-center gap-6">
              <Link to="/" className="text-foreground hover:text-primary font-medium">
                Home
              </Link>

              <Link to="/history" className="text-foreground hover:text-primary font-medium">
                History
              </Link>
            </nav>

            {/* Dark / Light mode */}
            <ThemeToggle />
          </header>

          {/* ROUTES */}
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/history" element={<HistoryPage />} />

            {/* CATCH-ALL */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
