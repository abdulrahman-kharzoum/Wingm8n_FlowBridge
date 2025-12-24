import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { RepositoryProvider } from "./contexts/RepositoryContext";
import { useAuth } from "./_core/hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RepositorySelection from "./pages/RepositorySelection";
import Home from "./pages/Home";
import ComparisonPage from "./pages/ComparisonPage";

function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center">
        <div className="animate-spin">
          <div className="h-12 w-12 border-4 border-accent border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <Component />;
}

function Router() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route
        path={"/select-repository"}
        component={() => <ProtectedRoute component={RepositorySelection} />}
      />
      <Route
        path={"/dashboard"}
        component={() => <ProtectedRoute component={Dashboard} />}
      />
      <Route
        path={"/compare"}
        component={() => <ProtectedRoute component={ComparisonPage} />}
      />
      <Route
        path={"/"}
        component={() => {
          if (loading) {
            return (
              <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center">
                <div className="animate-spin">
                  <div className="h-12 w-12 border-4 border-accent border-t-transparent rounded-full" />
                </div>
              </div>
            );
          }
          return isAuthenticated ? <Dashboard /> : <Login />;
        }}
      />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <RepositoryProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </RepositoryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
