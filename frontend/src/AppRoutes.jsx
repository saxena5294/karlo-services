import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import PublicLayout from "./components/layout/PublicLayout";
import { dashboardFeatures } from "./config/dashboardFeatures";

const page = (loader) => lazy(loader);
const namedPage = (loader, name) => lazy(async () => ({ default: (await loader())[name] }));
const CustomerApplicationDetails = page(() => import("./pages/customer/CustomerApplicationDetails"));
const CustomerDashboard = page(() => import("./pages/customer/CustomerDashboard"));
const CustomerProfile = page(() => import("./pages/customer/CustomerProfile"));
const MyApplications = page(() => import("./pages/customer/MyApplications"));
const ExpertApplicationDetails = page(() => import("./pages/expert/ExpertApplicationDetails"));
const ExpertApplications = page(() => import("./pages/expert/ExpertApplications"));
const ExpertDashboard = page(() => import("./pages/expert/ExpertDashboard"));
const ExpertProfile = page(() => import("./pages/expert/ExpertProfile"));
const NotificationsPage = page(() => import("./pages/shared/NotificationsPage"));
const ComingSoonPage = page(() => import("./pages/shared/ComingSoonPage"));
const DashboardServices = page(() => import("./pages/shared/DashboardServices"));
const FormHistory = page(() => import("./pages/shared/FormHistory"));
const loadDashboardModules = () => import("./pages/shared/DashboardModules");
const DeclarationFormsPage = namedPage(loadDashboardModules, "DeclarationFormsPage");
const PartnerRenewalPage = namedPage(loadDashboardModules, "PartnerRenewalPage");
const PaymentHistoryPage = namedPage(loadDashboardModules, "PaymentHistoryPage");
const ReferEarnPage = namedPage(loadDashboardModules, "ReferEarnPage");
const RewardsPage = namedPage(loadDashboardModules, "RewardsPage");
const SoftwarePage = namedPage(loadDashboardModules, "SoftwarePage");
const DashboardHelpPage = page(() => import("./pages/shared/DashboardHelpPage"));
const AdminApplicationDetails = page(() => import("./pages/admin/AdminApplicationDetails"));
const AdminApplications = page(() => import("./pages/admin/AdminApplications"));
const AdminCustomers = page(() => import("./pages/admin/AdminCustomers"));
const AdminDashboard = page(() => import("./pages/admin/AdminDashboard"));
const AdminReports = page(() => import("./pages/admin/AdminReports"));
const AdminExperts = page(() => import("./pages/admin/AdminExperts"));
const AdminServiceForm = page(() => import("./pages/admin/AdminServiceForm"));
const AdminServices = page(() => import("./pages/admin/AdminServices"));
const AdminSettings = page(() => import("./pages/admin/AdminSettings"));
const AdminAssignments = page(() => import("./pages/admin/AdminAssignments"));
const AdminPartners = page(() => import("./pages/admin/AdminPartners"));
const AdminPartnerDetails = page(() => import("./pages/admin/AdminPartnerDetails"));
const AdminLeads = page(() => import("./pages/admin/AdminLeads"));
const AdminLeadDetails = page(() => import("./pages/admin/AdminLeadDetails"));
const ContentManagementPage = page(() => import("./pages/admin/content/ContentManagementPage"));
const AdminAuditLogs = page(() => import("./pages/admin/AdminAuditLogs"));
const About = page(() => import("./pages/public/About"));
const ApplyService = page(() => import("./pages/public/ApplyService"));
const AuthPlaceholder = page(() => import("./pages/public/AuthPlaceholder"));
const Contact = page(() => import("./pages/public/Contact"));
const Home = page(() => import("./pages/public/Home"));
const NotFound = page(() => import("./pages/public/NotFound"));
const ServiceDetails = page(() => import("./pages/public/ServiceDetails"));
const Services = page(() => import("./pages/public/Services"));
const TrackApplication = page(() => import("./pages/public/TrackApplication"));
const FaqPage = page(() => import("./pages/public/FaqPage"));
const RefundPolicy = page(() => import("./pages/public/RefundPolicy"));
const PartnerDashboard = page(() => import("./pages/partner/PartnerDashboard"));
const PartnerLeadDetails = page(() => import("./pages/partner/PartnerLeadDetails"));
const PartnerApplicationDetails = page(() => import("./pages/partner/PartnerApplicationDetails"));
const PartnerApplications = page(() => import("./pages/partner/PartnerApplications"));
const PartnerRegistration = page(() => import("./pages/partner/PartnerRegistration"));
const PartnerWallet = page(() => import("./pages/partner/PartnerWallet"));
const PartnerProfile = page(() => import("./pages/partner/PartnerProfile"));

const AppRoutes = () => (
  <Suspense fallback={<div className="flex min-h-64 items-center justify-center text-sm text-slate-500" role="status">Loading page…</div>}>
    <Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<Home />} />
      <Route path="/services" element={<Services />} />
      <Route path="/services/:slug" element={<ServiceDetails />} />
      <Route path="/services/:slug/apply" element={<ApplyService />} />
      <Route path="/track" element={<TrackApplication />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/refund-policy" element={<RefundPolicy />} />
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
      <Route path="services" element={<DashboardServices />} />
      <Route path="form-history" element={<FormHistory portal="customer" />} />
      <Route path="software" element={<SoftwarePage />} />
      <Route path="declaration-forms" element={<DeclarationFormsPage />} />
      <Route path="payment-history" element={<PaymentHistoryPage />} />
      <Route path="refer-and-earn" element={<ReferEarnPage />} />
      <Route path="rewards" element={<RewardsPage />} />
      <Route path="help" element={<DashboardHelpPage portal="customer" />} />
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
    {/* TODO(auth): replace development partner auth with the future production guard. */}
    <Route path="/partner" element={<DashboardLayout />}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<PartnerDashboard />} />
      <Route path="register" element={<PartnerRegistration />} />
      {dashboardFeatures.leadMarketplace && <>
        <Route path="leads" element={<ComingSoonPage title="Available Leads" description="This partner feature will be available soon." />} />
        <Route path="leads/:id" element={<PartnerLeadDetails />} />
        <Route path="accepted-leads" element={<ComingSoonPage title="Accepted Leads" description="This partner feature will be available soon." />} />
        <Route path="completed-leads" element={<ComingSoonPage title="Accepted Work" description="This partner feature will be available soon." />} />
      </>}
      <Route path="applications" element={<PartnerApplications />} />
      <Route path="applications/:id" element={<PartnerApplicationDetails />} />
      <Route path="services" element={<DashboardServices />} />
      <Route path="form-history" element={<FormHistory portal="partner" />} />
      <Route path="software" element={<SoftwarePage />} />
      <Route path="declaration-forms" element={<DeclarationFormsPage />} />
      <Route path="payment-history" element={<PaymentHistoryPage />} />
      <Route path="renewal" element={<PartnerRenewalPage />} />
      <Route path="refer-and-earn" element={<ReferEarnPage />} />
      <Route path="rewards" element={<RewardsPage />} />
      <Route path="help" element={<DashboardHelpPage portal="partner" />} />
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
      {dashboardFeatures.leadMarketplace && <>
        <Route path="leads" element={<AdminLeads />} />
        <Route path="leads/:id" element={<AdminLeadDetails />} />
      </>}
      <Route path="services" element={<AdminServices />} />
      <Route path="services/new" element={<AdminServiceForm />} />
      <Route path="services/:id/edit" element={<AdminServiceForm />} />
      <Route path="services/:id/form-builder" element={<AdminServiceForm />} />
      <Route path="reports" element={<AdminReports />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="content" element={<ContentManagementPage />} />
      <Route path="audit-logs" element={<AdminAuditLogs />} />
      <Route path="settings" element={<AdminSettings />} />
    </Route>
    </Routes>
  </Suspense>
);

export default AppRoutes;
