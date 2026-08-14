import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ValidationPreview from "./pages/ValidationPreview";

const OnboardingPreview = () => <Home validationPreview="onboarding" />;
const ExportPreview = () => <Home validationPreview="export" />;
const ExportOnlyPreview = () => <ValidationPreview mode="export" />;

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      {import.meta.env.DEV && <Route path={"/__preview/onboarding"}><OnboardingPreview /></Route>}
      {import.meta.env.DEV && <Route path={"/__preview/export"}><ExportPreview /></Route>}
      {import.meta.env.DEV && <Route path={"/__preview/validation"}><ValidationPreview /></Route>}
      {import.meta.env.DEV && <Route path={"/__preview/export-menu"}><ExportOnlyPreview /></Route>}
      <Route path={"/"}><Home /></Route>
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
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
