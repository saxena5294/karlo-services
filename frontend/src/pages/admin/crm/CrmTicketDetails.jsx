import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getCrmTicket, replyCrmTicket, updateCrmTicket } from "../../../api/crmApi";
import CrmActivityPanels from "../../../components/crm/CrmActivityPanels";
import { CrmBadge, CrmHeader, crmInput } from "../../../components/crm/CrmUi";
import EmptyState from "../../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../../components/dashboard/LoadingSkeleton";
import { formatDate } from "../../../utils/dashboardFormatters";

const statuses = ["open", "in_progress", "waiting_for_user", "waiting_for_customer", "waiting_for_partner", "resolved", "closed"];

const CrmTicketDetails = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [reply, setReply] = useState("");
  const [form, setForm] = useState({ status: "", priority: "", assignedTo: "", resolution: "" });
  const apply = useCallback((result) => {
    setData(result);
    setForm({ status: result.ticket.status, priority: result.ticket.priority, assignedTo: result.ticket.assignedAdminId || "", resolution: result.ticket.resolution || "" });
  }, []);
  const load = useCallback(async () => {
    try { apply(await getCrmTicket(id)); }
    catch (error) { setFeedback(error.response?.data?.message || "Unable to load ticket."); }
  }, [apply, id]);
  useEffect(() => {
    let active = true;
    getCrmTicket(id).then((result) => active && apply(result)).catch((error) => active && setFeedback(error.response?.data?.message || "Unable to load ticket."));
    return () => { active = false; };
  }, [apply, id]);
  if (!data) return feedback ? <EmptyState title="Ticket unavailable" description={feedback}/> : <LoadingSkeleton count={8}/>;
  const save = async (event) => {
    event.preventDefault();
    try { await updateCrmTicket(id, form); setFeedback("Ticket updated."); await load(); }
    catch (error) { setFeedback(error.response?.data?.message || "Unable to update ticket."); }
  };
  const sendReply = async (event) => {
    event.preventDefault();
    try { await replyCrmTicket(id, reply); setReply(""); setFeedback("Reply added."); await load(); }
    catch (error) { setFeedback(error.response?.data?.message || "Unable to add reply."); }
  };
  const ticket = data.ticket;
  return <div className="space-y-7">
    <CrmHeader title={ticket.subject} description={`${ticket.ticketNumber} · ${ticket.createdByRole}: ${ticket.createdByUserId}`}/>
    {feedback && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{feedback}</p>}
    <section className="grid gap-6 xl:grid-cols-3">
      <article className="rounded-2xl border bg-white p-5 xl:col-span-2">
        <div className="flex gap-2"><CrmBadge value={ticket.status}/><CrmBadge value={ticket.priority}/><CrmBadge value={ticket.category}/></div>
        <p className="mt-5 whitespace-pre-wrap leading-7 text-slate-700">{ticket.description}</p>
        {ticket.replies?.length > 0 && <div className="mt-6 space-y-3"><h2 className="font-bold">Conversation</h2>{ticket.replies.map((item) => <article key={item._id} className={`rounded-xl p-4 ${item.authorRole === "admin" ? "bg-blue-50" : "bg-slate-50"}`}><p className="text-xs font-semibold">{item.authorRole} · {formatDate(item.createdAt)}</p><p className="mt-2 text-sm">{item.message}</p></article>)}</div>}
        {ticket.status !== "closed" && <form onSubmit={sendReply} className="mt-5 flex gap-2"><input required value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Add an admin-visible reply" className={crmInput}/><button className="self-end rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white">Reply</button></form>}
        {ticket.statusHistory?.length > 0 && <div className="mt-6"><h2 className="font-bold">Status history</h2>{ticket.statusHistory.map((item, index) => <p key={`${item.status}-${index}`} className="mt-2 text-sm"><CrmBadge value={item.status}/><span className="ml-2 text-slate-500">{item.changedBy} · {formatDate(item.changedAt)}</span></p>)}</div>}
      </article>
      <form onSubmit={save} className="rounded-2xl border bg-white p-5">
        <h2 className="font-bold">Ticket controls</h2>
        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className={crmInput}>{statuses.map((value) => <option key={value}>{value}</option>)}</select>
        <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className={crmInput}>{["low","normal","medium","high","urgent"].map((value) => <option key={value}>{value}</option>)}</select>
        <input value={form.assignedTo} onChange={(event) => setForm({ ...form, assignedTo: event.target.value })} className={crmInput} placeholder="Assigned admin ID"/>
        <textarea required={form.status === "resolved"} rows="4" value={form.resolution} onChange={(event) => setForm({ ...form, resolution: event.target.value })} className={crmInput} placeholder="Resolution"/>
        <button className="mt-3 w-full rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white">Save ticket</button>
      </form>
    </section>
    <CrmActivityPanels entityType="ticket" entityId={id} data={data} onRefresh={load}/>
  </div>;
};

export default CrmTicketDetails;
