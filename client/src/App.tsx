import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import User360 from "./pages/User360";

/**
 * Service Overview Dashboard
 * Command Center 스타일의 서비스 모니터링 대시보드
 * 다크 테마 기반, 높은 정보 밀도
 */

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/user/:userId" component={User360} />
      <Route path="/user" component={User360} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      {/* Command Center는 다크 테마가 기본 */}
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster 
            position="top-right"
            toastOptions={{
              style: {
                background: '#161B22',
                border: '1px solid #30363D',
                color: '#C9D1D9',
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
