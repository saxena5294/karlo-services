import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getAdminSettings,
  getApplicationWorkflowConfiguration,
  saveAdminSetting,
  saveApplicationWorkflowConfiguration,
} from "../../api/adminApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";

const AdminSettings = () => {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ key: "", value: "", description: "" });
  const [feedback, setFeedback] = useState("");
  const [workflow, setWorkflow] = useState(null);
  const load = () => getAdminSettings()
    .then((response) => setSettings(response.settings))
    .catch((error) => setFeedback(error.response?.data?.message || "Unable to load settings."));

  useEffect(() => {
    load();
    getApplicationWorkflowConfiguration()
      .then((response) => setWorkflow(response.workflow))
      .catch((error) => setFeedback(error.response?.data?.message || "Unable to load application lifecycle."));
  }, []);

  const save = async (event) => {
    event.preventDefault();
    try {
      await saveAdminSetting(form);
      setFeedback("Setting saved and audited.");
      setForm({ key: "", value: "", description: "" });
      load();
    } catch (error) {
      setFeedback(error.response?.data?.message || "Unable to save setting.");
    }
  };

  const toggleStatus = (status) => {
    const enabled = workflow.statuses.includes(status);
    const statuses = enabled
      ? workflow.statuses.filter((item) => item !== status)
      : [...workflow.statuses, status];
    const transitions = workflow.transitions
      .filter((item) => statuses.includes(item.from))
      .map((item) => ({ ...item, to: item.to.filter((target) => statuses.includes(target)) }));
    if (!enabled) transitions.push({ from: status, to: [] });
    setWorkflow({ ...workflow, statuses, transitions });
  };

  const toggleTransition = (from, to) => {
    const transitions = workflow.transitions.map((item) => {
      if (item.from !== from) return item;
      return {
        ...item,
        to: item.to.includes(to)
          ? item.to.filter((target) => target !== to)
          : [...item.to, to],
      };
    });
    setWorkflow({ ...workflow, transitions });
  };

  const saveWorkflow = async (event) => {
    event.preventDefault();
    try {
      const response = await saveApplicationWorkflowConfiguration({
        name: workflow.name,
        statuses: workflow.statuses,
        transitions: workflow.transitions,
      });
      setWorkflow({ ...response.workflow, availableStatuses: workflow.availableStatuses });
      setFeedback("Application lifecycle saved and audited.");
    } catch (error) {
      setFeedback(error.response?.data?.message || "Unable to save application lifecycle.");
    }
  };

  return <div className="space-y-6">
    <div><ShieldCheck className="text-blue-700" size={32} /><h2 className="mt-3 text-2xl font-bold">Platform settings</h2><p className="mt-1 text-slate-500">Non-secret operational configuration. Authentication and credentials remain outside this store.</p></div>
    {feedback && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{feedback}</p>}
    <form onSubmit={save} className="grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-2">
      <label className="text-sm font-semibold">Key<input required placeholder="applications.auto_assign" value={form.key} onChange={(event) => setForm({ ...form, key: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
      <label className="text-sm font-semibold">Value<input required value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
      <label className="text-sm font-semibold md:col-span-2">Description<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
      <button className="rounded-lg bg-blue-700 px-4 py-2 text-white md:col-span-2">Save setting</button>
    </form>
    {!settings ? <LoadingSkeleton count={3} /> : !settings.length ? <EmptyState title="No platform settings" description="Defaults remain in effect until a non-secret setting is added." /> : <div className="divide-y rounded-2xl border bg-white">{settings.map((item) => <div key={item._id} className="p-4"><strong>{item.key}</strong><p className="text-sm text-slate-600">{String(item.value)}</p><p className="text-xs text-slate-400">{item.description}</p></div>)}</div>}
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold">Application lifecycle</h3>
      <p className="mt-1 text-sm text-slate-500">Enable stages and choose the allowed next stages. Statuses already used by active applications cannot be disabled.</p>
      {!workflow ? <div className="mt-4"><LoadingSkeleton count={4} /></div> : <form onSubmit={saveWorkflow} className="mt-5 space-y-5">
        <label className="block text-sm font-semibold">Workflow name<input required maxLength="120" value={workflow.name} onChange={(event) => setWorkflow({ ...workflow, name: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
        <div>
          <p className="text-sm font-semibold">Enabled stages</p>
          <div className="mt-2 flex flex-wrap gap-2">{workflow.availableStatuses.map((status) => <label key={status} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold ${workflow.statuses.includes(status) ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-500"}`}><input type="checkbox" checked={workflow.statuses.includes(status)} onChange={() => toggleStatus(status)} className="sr-only" />{status}</label>)}</div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">{workflow.transitions.map((transition) => <fieldset key={transition.from} className="rounded-xl border p-4"><legend className="px-1 text-sm font-bold">{transition.from}</legend><p className="mb-2 text-xs text-slate-500">Allowed next stages</p><div className="flex flex-wrap gap-2">{workflow.statuses.filter((status) => status !== transition.from).map((status) => <label key={status} className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs ${transition.to.includes(status) ? "bg-emerald-50 font-semibold text-emerald-800" : "bg-slate-50 text-slate-500"}`}><input type="checkbox" checked={transition.to.includes(status)} onChange={() => toggleTransition(transition.from, status)} className="mr-1.5" />{status}</label>)}</div></fieldset>)}</div>
        <button disabled={!workflow.statuses.length} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Save lifecycle</button>
      </form>}
    </section>
    <p className="text-xs text-slate-500">This page is protected by a Clerk session and the administrator role stored in MongoDB.</p>
  </div>;
};

export default AdminSettings;
