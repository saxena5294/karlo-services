import { getPartnerDashboardSummary } from "../../api/partnerApi";
import AssigneeDashboard from "../../components/dashboard/AssigneeDashboard";

const PartnerDashboard = () => <AssigneeDashboard role="partner" loadSummary={getPartnerDashboardSummary} />;
export default PartnerDashboard;
