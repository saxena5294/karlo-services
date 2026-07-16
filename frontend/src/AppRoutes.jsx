import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import PublicLayout from "./components/layout/PublicLayout";
import CustomerApplicationDetails from "./pages/customer/CustomerApplicationDetails";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CustomerProfile from "./pages/customer/CustomerProfile";
import MyApplications from "./pages/customer/MyApplications";
import ExpertApplicationDetails from "./pages/expert/ExpertApplicationDetails";
import ExpertApplications from "./pages/expert/ExpertApplications";
import ExpertDashboard from "./pages/expert/ExpertDashboard";
import ExpertProfile from "./pages/expert/ExpertProfile";
import NotificationsPage from "./pages/shared/NotificationsPage";
import AdminApplicationDetails from "./pages/admin/AdminApplicationDetails";
import AdminApplications from "./pages/admin/AdminApplications";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminReports from "./pages/admin/AdminReports";
import AdminExperts from "./pages/admin/AdminExperts";
import AdminServiceForm from "./pages/admin/AdminServiceForm";
import AdminServices from "./pages/admin/AdminServices";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAssignments from "./pages/admin/AdminAssignments";
import AdminPartners from "./pages/admin/AdminPartners";
import AdminPartnerDetails from "./pages/admin/AdminPartnerDetails";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminLeadDetails from "./pages/admin/AdminLeadDetails";
import AdminContent from "./pages/admin/AdminContent";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import About from "./pages/public/About";
import ApplyService from "./pages/public/ApplyService";
import AuthPlaceholder from "./pages/public/AuthPlaceholder";
import Contact from "./pages/public/Contact";
import Home from "./pages/public/Home";
import NotFound from "./pages/public/NotFound";
import ServiceDetails from "./pages/public/ServiceDetails";
import Services from "./pages/public/Services";
import TrackApplication from "./pages/public/TrackApplication";
import PartnerDashboard from "./pages/partner/PartnerDashboard";
import PartnerLeads from "./pages/partner/PartnerLeads";
import PartnerLeadDetails from "./pages/partner/PartnerLeadDetails";
import PartnerApplicationDetails from "./pages/partner/PartnerApplicationDetails";
import PartnerWallet from "./pages/partner/PartnerWallet";
import PartnerProfile from "./pages/partner/PartnerProfile";

const AppRoutes = () => (
  <Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<Home />} />
      <Route path="/services" element={<Services />} />
      <Route path="/services/:slug" element={<ServiceDetails />} />
      <Route path="/services/:slug/apply" element={<ApplyService />} />
      <Route path="/track" element={<TrackApplication />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<AuthPlaceholder mode="login" />} />
      <Route path="/register" element={<AuthPlaceholder mode="register" />} />
      <Route path="*" element={<NotFound />} />
    </Route>

    {/* TODO(Clerk): wrap this branch with a Clerk customer route guard later. */}
    <Route path="/customer" element={<DashboardLayout />}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<CustomerDashboard />} />
      <Route path="applications" element={<MyApplications />} />
      <Route path="applications/:id" element={<CustomerApplicationDetails />} />
      <Route path="profile" element={<CustomerProfile />} />
      <Route path="notifications" element={<NotificationsPage />} />
    </Route>

    {/* TODO(auth): wrap this branch with the future expert route guard. */}
    <Route path="/expert" element={<DashboardLayout />}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<ExpertDashboard />} />
      <Route path="applications" element={<ExpertApplications />} />
      <Route path="applications/:id" element={<ExpertApplicationDetails />} />
      <Route path="profile" element={<ExpertProfile />} />
      <Route path="notifications" element={<NotificationsPage />} />
    </Route>
    {/* Temporary deep-link aliases for retailer-era bookmarks and notifications. */}
    <Route path="/retailer" element={<DashboardLayout />}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<ExpertDashboard />} />
      <Route path="applications" element={<ExpertApplications />} />
      <Route path="applications/:id" element={<ExpertApplicationDetails />} />
      <Route path="profile" element={<ExpertProfile />} />
      <Route path="notifications" element={<NotificationsPage />} />
    </Route>

    {/* TODO(auth): replace development partner auth with the future production guard. */}
    <Route path="/partner" element={<DashboardLayout />}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<PartnerDashboard />} />
      <Route path="leads" element={<PartnerLeads mode="available" />} />
      <Route path="leads/:id" element={<PartnerLeadDetails />} />
      <Route path="accepted-leads" element={<PartnerLeads mode="accepted" />} />
      <Route path="completed-leads" element={<PartnerLeads mode="completed" />} />
      <Route path="applications/:id" element={<PartnerApplicationDetails />} />
      <Route path="wallet" element={<PartnerWallet />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="profile" element={<PartnerProfile />} />
    </Route>

    {/* TODO(Clerk): wrap this branch with a Clerk admin route guard later. */}
    <Route path="/admin" element={<DashboardLayout />}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="applications" element={<AdminApplications />} />
      <Route path="applications/:id" element={<AdminApplicationDetails />} />
      <Route path="assignments" element={<AdminAssignments />} />
      <Route path="customers" element={<AdminCustomers />} />
      <Route path="experts" element={<AdminExperts />} />
      <Route path="partners" element={<AdminPartners />} />
      <Route path="partners/:id" element={<AdminPartnerDetails />} />
      <Route path="leads" element={<AdminLeads />} />
      <Route path="leads/:id" element={<AdminLeadDetails />} />
      <Route path="retailers" element={<Navigate to="../experts" replace />} />
      <Route path="services" element={<AdminServices />} />
      <Route path="services/new" element={<AdminServiceForm />} />
      <Route path="services/:id/edit" element={<AdminServiceForm />} />
      <Route path="services/:id/form-builder" element={<AdminServiceForm />} />
      <Route path="reports" element={<AdminReports />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="content" element={<AdminContent />} />
      <Route path="audit-logs" element={<AdminAuditLogs />} />
      <Route path="settings" element={<AdminSettings />} />
    </Route>
  </Routes>
);

export default AppRoutes;
