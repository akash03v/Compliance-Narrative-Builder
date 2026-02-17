import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import UploadData from "@/pages/UploadData";
import Customers from "@/pages/Customers";
import Alerts from "@/pages/Alerts";
import SarsList from "@/pages/SarsList";
import SarDetail from "@/pages/SarDetail";
import SarComparison from "@/pages/SarComparison";
import AuditTrail from "@/pages/AuditTrail";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/upload" component={UploadData} />
      <Route path="/customers" component={Customers} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/sars" component={SarsList} />
      <Route path="/sars/:id" component={SarDetail} />
      <Route path="/sars/:id/compare" component={SarComparison} />
      <Route path="/sars/:id/audit" component={AuditTrail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
