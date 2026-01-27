import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import GroupsPage from "./pages/Groups";
import SchedulePage from "./pages/Schedule";
import GradebookPage from "./pages/Gradebook";
import AssignmentsPage from "./pages/Assignments";
import AssignmentCreatePage from "./pages/AssignmentCreate";
import LibraryPage from "./pages/Library";
import CoinsPage from "./pages/Coins";
import UsersPage from "./pages/Users";
import CampusesPage from "./pages/Campuses";
import NotificationsPage from "./pages/Notifications";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/gradebook" element={<GradebookPage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/assignments/create" element={<AssignmentCreatePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/coins" element={<CoinsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/campuses" element={<CampusesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
