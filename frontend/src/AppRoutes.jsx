import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import PublicLayout from "./components/layout/PublicLayout";
import { dashboardFeatures } from "./config/dashboardFeatures";
import ProtectedRoute from "./auth/ProtectedRoute";
import AuthenticatedRoute from "./auth/AuthenticatedRoute";

const page = (loader) => lazy(loader);
const namedPage = (loader, name) => lazy(async () => ({ default: (await loader())[name] }));
const CustomerApplicationDetails = page(() => import("./pages/customer/CustomerApplicationDetails"));
const CustomerDashboard = page(() => import("./pages/customer/CustomerDashboard"));
const CustomerProfile = page(() => import("./pages/customer/CustomerProfile"));
const CustomerDocuments = page(() => import("./pages/customer/CustomerDocuments"));
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
const DeclarationFormsPage = page(() => import("./pages/shared/DeclarationFormsPage"));
const PartnerRenewalPage = namedPage(loadDashboardModules, "PartnerRenewalPage");
const PaymentHistoryPage = namedPage(loadDashboardModules, "PaymentHistoryPage");
const ReferEarnPage = namedPage(loadDashboardModules, "ReferEarnPage");
const RewardsPage = namedPage(loadDashboardModules, "RewardsPage");
const SoftwarePage = namedPage(loadDashboardModules, "SoftwarePage");
const DashboardHelpPage = page(() => import("./pages/shared/DashboardHelpPage"));
const AdminApplicationDetails = page(() => import("./pages/admin/AdminApplicationDetails"));
const AdminApplications = page(() => import("./pages/admin/AdminApplications"));
const AdminCustomers = page(() => import("./pages/admin/AdminCustomers"));
const AdminCustomerDetails = page(() => import("./pages/admin/AdminCustomerDetails"));
const AdminCustomerDocuments = page(() => import("./pages/admin/AdminCustomerDocuments"));
const AdminDashboard = page(() => import("./pages/admin/AdminDashboard"));
const AdminReports = page(() => import("./pages/admin/AdminReports"));
const AdminExperts = page(() => import("./pages/admin/AdminExperts"));
const AdminExpertDetails = page(() => import("./pages/admin/AdminExpertDetails"));
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
const AdminDeclarationForms = page(() => import("./pages/admin/AdminDeclarationForms"));
const CrmOverview = page(() => import("./pages/admin/crm/CrmOverview"));
const CrmDirectory = page(() => import("./pages/admin/crm/CrmDirectory"));
const CrmEntityDetails = page(() => import("./pages/admin/crm/CrmEntityDetails"));
const CrmLeads = page(() => import("./pages/admin/crm/CrmLeads"));
const CrmLeadDetails = page(() => import("./pages/admin/crm/CrmLeadDetails"));
const CrmTickets = page(() => import("./pages/admin/crm/CrmTickets"));
const CrmTicketDetails = page(() => import("./pages/admin/crm/CrmTicketDetails"));
const CrmFollowUps = page(() => import("./pages/admin/crm/CrmFollowUps"));
const About = page(() => import("./pages/public/About"));
const ApplyService = page(() => import("./pages/public/ApplyService"));
const AuthPage = page(() => import("./pages/public/AuthPage"));
const AuthComplete = page(() => import("./pages/public/AuthComplete"));
const ApprovalPending = page(() => import("./pages/public/ApprovalPending"));
const AccountUnavailable = page(() => import("./pages/public/AccountUnavailable"));
const AuthOnboarding = page(() => import("./pages/public/AuthOnboarding"));
const CompleteProfile = page(() => import("./pages/shared/CompleteProfile"));
const Contact = page(() => import("./pages/public/Contact"));
const Home = page(() => import("./pages/public/Home"));
const NotFound = page(() => import("./pages/public/NotFound"));
const ServiceDetails = page(() => import("./pages/public/ServiceDetails"));
const Services = page(() => import("./pages/public/Services"));
const TrackApplication = page(() => import("./pages/public/TrackApplication"));
const FaqPage = page(() => import("./pages/public/FaqPage"));
const Blogs = page(() => import("./pages/public/Blogs"));
const BlogDetails = page(() => import("./pages/public/BlogDetails"));
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
      <Route path="/services/:slug/apply" element={<ProtectedRoute role="customer"><ApplyService /></ProtectedRoute>} />
      <Route path="/track" element={<TrackApplication />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/blogs" element={<Blogs />} />
      <Route path="/blogs/:slug" element={<BlogDetails />} />
      <Route path="/refund-policy" element={<RefundPolicy />} />
      <Route path="/login/*" element={<AuthPage mode="login" />} />
      <Route path="/register/*" element={<AuthPage mode="register" />} />
      <Route path="/auth/complete" element={<AuthComplete />} />
      <Route path="/auth/redirect" element={<AuthComplete />} />
      <Route path="/auth/onboarding" element={<AuthenticatedRoute><AuthOnboarding /></AuthenticatedRoute>} />
      <Route path="/approval-pending" element={<ApprovalPending />} />
      <Route path="/account-unavailable" element={<AccountUnavailable />} />
      <Route path="/profile/complete" element={<CompleteProfile />} />
      <Route path="/onboarding/partner" element={<ProtectedRoute role="partner" allowPending><PartnerRegistration onboarding /></ProtectedRoute>} />
      <Route path="/onboarding/expert" element={<ProtectedRoute role="expert" allowPending><ExpertProfile onboarding /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Route>

    <Route path="/customer" element={<ProtectedRoute role="customer"><DashboardLayout /></ProtectedRoute>}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<CustomerDashboard />} />
      <Route path="applications" element={<MyApplications />} />
      <Route path="applications/:id" element={<CustomerApplicationDetails />} />
      <Route path="documents" element={<CustomerDocuments />} />
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

    <Route path="/expert" element={<ProtectedRoute role="expert"><DashboardLayout /></ProtectedRoute>}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<ExpertDashboard />} />
      <Route path="applications" element={<ExpertApplications />} />
      <Route path="applications/:id" element={<ExpertApplicationDetails />} />
      <Route path="profile" element={<ExpertProfile />} />
      <Route path="notifications" element={<NotificationsPage />} />
    </Route>
    <Route path="/partner" element={<ProtectedRoute role="partner"><DashboardLayout /></ProtectedRoute>}>
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

    <Route path="/admin" element={<ProtectedRoute role="admin"><DashboardLayout /></ProtectedRoute>}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="applications" element={<AdminApplications />} />
      <Route path="applications/:id" element={<AdminApplicationDetails />} />
      <Route path="customer-documents" element={<AdminCustomerDocuments />} />
      <Route path="assignments" element={<AdminAssignments />} />
      <Route path="crm" element={<CrmOverview />} />
      <Route path="crm/customers" element={<CrmDirectory type="customers" />} />
      <Route path="crm/customers/:id" element={<CrmEntityDetails type="customer" />} />
      <Route path="crm/partners" element={<CrmDirectory type="partners" />} />
      <Route path="crm/partners/:id" element={<CrmEntityDetails type="partner" />} />
      <Route path="crm/experts" element={<CrmDirectory type="experts" />} />
      <Route path="crm/experts/:id" element={<CrmEntityDetails type="expert" />} />
      <Route path="crm/leads" element={<CrmLeads />} />
      <Route path="crm/leads/:id" element={<CrmLeadDetails />} />
      <Route path="crm/tickets" element={<CrmTickets />} />
      <Route path="crm/tickets/:id" element={<CrmTicketDetails />} />
      <Route path="crm/follow-ups" element={<CrmFollowUps />} />
      <Route path="customers" element={<AdminCustomers />} />
      <Route path="customers/:id" element={<AdminCustomerDetails />} />
      <Route path="experts" element={<AdminExperts />} />
      <Route path="experts/pending" element={<Navigate to="/admin/experts?status=pending" replace />} />
      <Route path="experts/:id" element={<AdminExpertDetails />} />
      <Route path="partners" element={<AdminPartners />} />
      <Route path="partners/pending" element={<Navigate to="/admin/partners?status=pending" replace />} />
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
      <Route path="declaration-forms" element={<AdminDeclarationForms />} />
      <Route path="audit-logs" element={<AdminAuditLogs />} />
      <Route path="settings" element={<AdminSettings />} />
    </Route>
    </Routes>
  </Suspense>
);

export default AppRoutes;
