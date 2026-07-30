import { useCallback, useEffect, useState } from "react";
import { getCrmCommunications, getCrmFollowUps, getCrmNotes } from "../../api/crmApi";
import CrmActivityPanels from "./CrmActivityPanels";

const CrmApplicationActivity = ({ applicationId }) => {
  const [data, setData] = useState({ notes: [], followUps: [], communications: [] });
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [notes, followUps, communications] = await Promise.all([
        getCrmNotes("application", applicationId),
        getCrmFollowUps({ entityType: "application", entityId: applicationId, limit: 100 }),
        getCrmCommunications("application", applicationId),
      ]);
      setData({ notes: notes.items, followUps: followUps.items, communications: communications.items });
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load CRM activity.");
    }
  }, [applicationId]);
  useEffect(() => {
    let active = true;
    Promise.all([
      getCrmNotes("application", applicationId),
      getCrmFollowUps({ entityType: "application", entityId: applicationId, limit: 100 }),
      getCrmCommunications("application", applicationId),
    ]).then(([notes, followUps, communications]) => active && setData({ notes: notes.items, followUps: followUps.items, communications: communications.items })).catch((requestError) => active && setError(requestError.response?.data?.message || "Unable to load CRM activity."));
    return () => { active = false; };
  }, [applicationId]);
  return <section className="space-y-4"><div><h2 className="text-xl font-bold">CRM activity</h2><p className="text-sm text-slate-500">Private relationship notes, follow-ups, and communication history for this application.</p></div>{error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<CrmActivityPanels entityType="application" entityId={applicationId} data={data} onRefresh={load}/></section>;
};

export default CrmApplicationActivity;
