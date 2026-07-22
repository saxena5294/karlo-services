import { getExpertDashboardSummary } from "../../api/expertApi";
import AssigneeDashboard from "../../components/dashboard/AssigneeDashboard";

const ExpertDashboard = () => <AssigneeDashboard role="expert" loadSummary={getExpertDashboardSummary} />;
export default ExpertDashboard;
