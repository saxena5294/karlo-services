import {
  Camera,
  CheckCircle2,
  ClipboardList,
  FileText,
  Files,
  FolderPlus,
  Info,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { sendMobileOtp, verifyMobileOtp } from "../../api/serviceApi";
import CaptchaChallenge from "../security/CaptchaChallenge";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const inputClass = "mt-2 min-h-14 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
const invalidInputClass = "border-rose-400 focus:border-rose-500 focus:ring-rose-100";

const conditionMatches = (rule, values) => {
  if (!rule?.field) return true;
  const actual = String(values[rule.field] ?? "");
  if (rule.operator === "not_equals") return actual !== String(rule.value ?? "");
  if (rule.operator === "in") return (Array.isArray(rule.value) ? rule.value : [rule.value]).map(String).includes(actual);
  return actual === String(rule.value ?? "");
};

const validateFile = (file) => {
  if (!allowedTypes.has(file.type)) return "Only JPG, PNG and PDF files are allowed.";
  if (file.size > MAX_FILE_SIZE) return "File must be smaller than 10 MB.";
  return "";
};

const formatSize = (size) => `${(size / 1024 / 1024).toFixed(size > 1024 * 1024 ? 1 : 2)} MB`;
const isMissing = (value) => Array.isArray(value) ? value.length === 0 : !String(value ?? "").trim();

const FilePreview = ({ file }) => {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!file?.type.startsWith("image/")) {
      const reset = setTimeout(() => setUrl(""), 0);
      return () => clearTimeout(reset);
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => setUrl(String(reader.result)));
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);

  return url
    ? <img src={url} alt={`Preview of ${file.name}`} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
    : <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700"><FileText size={30} /></span>;
};

const SectionCard = ({ icon: Icon, title, description, children, optional = false }) => (
  <section className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <div className="flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon size={23} /></span>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          {optional && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Optional</span>}
        </div>
        {description && <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>}
      </div>
    </div>
    <div className="mt-6 space-y-5">{children}</div>
  </section>
);

const FieldError = ({ message }) => message
  ? <p className="mt-2 text-sm font-medium text-rose-700" role="alert">{message}</p>
  : null;

const DynamicForm = ({ form, service, variant = null, isSubmitting, onSubmit }) => {
  const formRef = useRef(null);
  const fields = useMemo(() => form.fields || [], [form.fields]);
  const [values, setValues] = useState({});
  const [files, setFiles] = useState({});
  const [proofTypes, setProofTypes] = useState({});
  const [extras, setExtras] = useState([]);
  const [touched, setTouched] = useState({});
  const [fileErrors, setFileErrors] = useState({});
  const [extraErrors, setExtraErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [otpRequestError, setOtpRequestError] = useState("");
  const [otpState, setOtpState] = useState({ sent: false, verified: false, token: "", developmentOtp: "" });
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [captchaToken, setCaptchaToken] = useState("");

  useEffect(() => {
    if (!countdown) return undefined;
    const timer = setInterval(() => setCountdown((value) => Math.max(value - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const visibleFields = useMemo(() => fields.filter((field) => conditionMatches(field.conditional, values)), [fields, values]);
  const applicantFields = visibleFields.filter(({ name }) => ["applicantName", "mobileNumber", "email"].includes(name));
  const serviceFields = visibleFields.filter(({ name, type }) => type !== "file" && !["applicantName", "mobileNumber", "email"].includes(name));
  const documentFields = visibleFields.filter(({ type }) => type === "file");
  const extraLimit = Math.min(form.maxAdditionalDocuments ?? 6, 6);

  const fieldMessage = (field) => {
    const value = values[field.name];
    if (field.required && isMissing(value)) return `${field.label} is required.`;
    if (field.name === "applicantName" && value && String(value).trim().length < 2) return "Enter the applicant's full name.";
    if (field.name === "mobileNumber" && value && !/^[6-9]\d{9}$/.test(value)) return "Enter a valid 10-digit Indian mobile number.";
    if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address.";
    if (field.minLength && value && String(value).trim().length < field.minLength) return `${field.label} must contain at least ${field.minLength} characters.`;
    if (field.maxLength && value && String(value).length > field.maxLength) return `${field.label} must contain no more than ${field.maxLength} characters.`;
    return "";
  };

  const fieldError = (field) => (touched[field.name] || submitted) ? fieldMessage(field) : "";
  const documentError = (field) => {
    if (fileErrors[field.name]) return fileErrors[field.name];
    if ((touched[field.name] || submitted) && field.required && !files[field.name]?.length) return `${field.label} is required.`;
    if ((touched[field.name] || submitted) && (field.required || files[field.name]?.length) && field.documentOptions?.length && !proofTypes[field.name]) return `Select a document type for ${field.label}.`;
    return "";
  };

  const setValue = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    if (name === "mobileNumber") {
      setOtpState({ sent: false, verified: false, token: "", developmentOtp: "" });
      setOtp("");
      setOtpRequestError("");
    }
  };

  const setFieldFiles = (field, selected) => {
    setTouched((current) => ({ ...current, [field.name]: true }));
    const selectedFiles = [...selected];
    const invalid = selectedFiles.map(validateFile).find(Boolean);
    const limit = field.maxFiles || (field.multiple ? 10 : 1);
    const message = invalid || (selectedFiles.length > limit ? `${field.label} accepts a maximum of ${limit} files.` : "");
    setFileErrors((current) => ({ ...current, [field.name]: message }));
    if (!message) setFiles((current) => ({ ...current, [field.name]: selectedFiles }));
  };

  const removeFieldFile = (field, index) => {
    setTouched((current) => ({ ...current, [field.name]: true }));
    setFileErrors((current) => ({ ...current, [field.name]: "" }));
    setFiles((current) => ({ ...current, [field.name]: (current[field.name] || []).filter((_, itemIndex) => itemIndex !== index) }));
  };

  const sendOtp = async () => {
    setTouched((current) => ({ ...current, mobileNumber: true }));
    const mobileField = applicantFields.find(({ name }) => name === "mobileNumber");
    if (!mobileField || fieldMessage(mobileField)) return;
    setOtpRequestError("");
    try {
      const result = await sendMobileOtp(values.mobileNumber);
      setOtpState({ sent: true, verified: false, token: "", developmentOtp: result.developmentOtp || "" });
      setCountdown(result.resendAfterSeconds || 60);
    } catch (requestError) {
      setOtpRequestError(requestError.response?.data?.message || "Unable to send OTP. Please try again.");
    }
  };

  const verifyOtp = async () => {
    setTouched((current) => ({ ...current, otp: true }));
    if (otp.length !== 6) return;
    setOtpRequestError("");
    try {
      const result = await verifyMobileOtp(values.mobileNumber, otp);
      setOtpState({ sent: true, verified: true, token: result.mobileVerificationToken, developmentOtp: "" });
    } catch (requestError) {
      setOtpRequestError(requestError.response?.data?.message || "The OTP is incorrect or expired.");
    }
  };

  const addExtra = () => {
    if (extras.length >= extraLimit) return;
    setExtras((current) => [...current, { id: crypto.randomUUID(), label: "", file: null }]);
  };

  const updateExtraFile = (id, file) => {
    const message = file ? validateFile(file) : "Choose a document file.";
    setExtraErrors((current) => ({ ...current, [id]: { ...current[id], file: message } }));
    if (!message) setExtras((current) => current.map((item) => item.id === id ? { ...item, file } : item));
  };

  const removeExtra = (id) => {
    setExtras((current) => current.filter((item) => item.id !== id));
    setExtraErrors((current) => { const next = { ...current }; delete next[id]; return next; });
  };

  const validateAll = () => {
    const fieldErrors = [...applicantFields, ...serviceFields].some((field) => fieldMessage(field));
    const documentErrors = documentFields.some((field) => (field.required && !files[field.name]?.length) || ((field.required || files[field.name]?.length) && field.documentOptions?.length && !proofTypes[field.name]) || fileErrors[field.name]);
    const nextExtraErrors = {};
    extras.forEach((item) => {
      nextExtraErrors[item.id] = {
        label: item.label.trim() ? "" : "Enter a document name.",
        file: item.file ? validateFile(item.file) : "Choose a document file.",
      };
    });
    setExtraErrors(nextExtraErrors);
    const extrasInvalid = Object.values(nextExtraErrors).some(({ label, file }) => label || file);
    return !fieldErrors && !documentErrors && !extrasInvalid && otpState.verified && values.termsAccepted === true && Boolean(captchaToken);
  };

  const submit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setSubmitted(true);
    setFormError("");
    if (!validateAll()) {
      setFormError("Please correct the highlighted fields before submitting.");
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"], [role="alert"]')?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }

    const payload = new FormData();
    visibleFields.forEach((field) => {
      if (field.type === "file") (files[field.name] || []).forEach((file) => payload.append(field.name, file));
      else {
        const value = values[field.name];
        if (Array.isArray(value)) value.forEach((item) => payload.append(field.name, item));
        else if (value !== undefined && value !== "") payload.append(field.name, value);
      }
      if (proofTypes[field.name]) payload.append(`${field.name}__documentType`, proofTypes[field.name]);
    });
    const labels = {};
    extras.forEach((item, index) => {
      const key = `additionalDocument__${index}`;
      payload.append(key, item.file);
      labels[key] = item.label.trim();
    });
    payload.append("additionalDocumentLabels", JSON.stringify(labels));
    payload.append("additionalDetails", values.additionalDetails || "");
    payload.append("termsAccepted", "true");
    payload.append("mobileVerificationToken", otpState.token);
    payload.append("captchaToken", captchaToken);
    if (variant?.key) payload.append("variantKey", variant.key);
    onSubmit(payload);
  };

  const renderField = (field) => {
    const error = fieldError(field);
    const describedBy = error ? `${field.name}-error` : field.helpText ? `${field.name}-help` : undefined;
    const label = <label htmlFor={field.name} className="block text-base font-bold text-slate-800">{field.label}{field.labelHindi && <span className="ml-1 font-medium text-slate-500">/ {field.labelHindi}</span>}{field.required && <span className="ml-1 text-rose-600">*</span>}</label>;

    if (field.type === "textarea") return <div>{label}<textarea id={field.name} rows="4" maxLength={field.maxLength} value={values[field.name] || ""} onChange={(event) => setValue(field.name, event.target.value)} onBlur={() => setTouched((current) => ({ ...current, [field.name]: true }))} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={`${inputClass} ${error ? invalidInputClass : ""}`} />{field.maxLength && <p className="mt-1 text-right text-xs text-slate-500">{String(values[field.name] || "").length}/{field.maxLength}</p>}<span id={`${field.name}-error`}><FieldError message={error} /></span></div>;
    if (["select", "radio"].includes(field.type)) return <div>{label}<select id={field.name} value={values[field.name] || ""} onChange={(event) => setValue(field.name, event.target.value)} onBlur={() => setTouched((current) => ({ ...current, [field.name]: true }))} aria-invalid={Boolean(error)} className={`${inputClass} ${error ? invalidInputClass : ""}`}><option value="">Select an option</option>{(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><FieldError message={error} /></div>;
    if (field.type === "checkbox") return <fieldset><legend className="font-bold">{field.label}</legend>{(field.options?.length ? field.options : [{ label: field.label, value: "true" }]).map((option) => <label key={option.value} className="mt-2 flex min-h-14 items-center gap-3 rounded-xl border p-4"><input type="checkbox" className="h-5 w-5" checked={(values[field.name] || []).includes(option.value)} onChange={(event) => { setTouched((current) => ({ ...current, [field.name]: true })); setValue(field.name, event.target.checked ? [...new Set([...(values[field.name] || []), option.value])] : (values[field.name] || []).filter((value) => value !== option.value)); }} />{option.label}</label>)}<FieldError message={error} /></fieldset>;
    return <div>{label}<input id={field.name} type={field.type} inputMode={field.type === "tel" ? "numeric" : undefined} minLength={field.minLength} maxLength={field.maxLength} value={values[field.name] || ""} onChange={(event) => setValue(field.name, field.type === "tel" ? event.target.value.replace(/\D/g, "").slice(0, 10) : event.target.value)} onBlur={() => setTouched((current) => ({ ...current, [field.name]: true }))} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={`${inputClass} ${error ? invalidInputClass : ""}`} />{field.helpText && <p id={`${field.name}-help`} className="mt-2 text-sm text-slate-500">{field.helpText}</p>}<span id={`${field.name}-error`}><FieldError message={error} /></span></div>;
  };

  const renderDocument = (field) => {
    const error = documentError(field);
    const uploaded = files[field.name] || [];
    return (
      <article key={field.name} className={`rounded-2xl border p-4 sm:p-5 ${error ? "border-rose-300 bg-rose-50/30" : "border-slate-200"}`}>
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="font-bold text-slate-900">{field.label}{field.labelHindi && <span className="ml-1 font-medium text-slate-500">/ {field.labelHindi}</span>} {field.required ? <span className="text-rose-600">*</span> : <span className="ml-2 text-xs font-medium text-slate-500">Optional</span>}</h3>{field.helpText && <p className="mt-1 text-sm text-slate-500">{field.helpText}</p>}</div>
          {uploaded.length > 0 && <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"><CheckCircle2 size={17} /> Ready</span>}
        </div>
        {field.documentOptions?.length > 0 && <select aria-label={`Select proof type for ${field.label}`} value={proofTypes[field.name] || ""} onChange={(event) => { setTouched((current) => ({ ...current, [field.name]: true })); setProofTypes((current) => ({ ...current, [field.name]: event.target.value })); }} aria-invalid={Boolean(error && !proofTypes[field.name])} className={`${inputClass} ${error && !proofTypes[field.name] ? invalidInputClass : ""}`}><option value="">Select document type</option>{field.documentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}
        <label className="mt-4 flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 px-4 py-3 text-center font-bold text-blue-700 focus-within:ring-4 focus-within:ring-blue-100">
          <Upload size={21} /> {uploaded.length ? "Replace file" : "Upload file"} / {uploaded.length ? "फ़ाइल बदलें" : "फ़ाइल चुनें"}
          <input id={field.name} type="file" className="sr-only" accept="image/jpeg,image/png,application/pdf" capture={field.allowCamera ? field.capture || undefined : undefined} multiple={(field.maxFiles || 1) > 1} onChange={(event) => setFieldFiles(field, event.target.files)} disabled={isSubmitting} aria-invalid={Boolean(error)} />
        </label>
        {field.allowCamera && <p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Camera size={14} /> Camera upload is available on supported phones.</p>}
        <div className="mt-3 space-y-2">{uploaded.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"><FilePreview file={file} /><div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-800">{file.name}</p><p className="mt-1 text-xs text-slate-500">{formatSize(file.size)} · Ready to upload</p></div><button type="button" onClick={() => removeFieldFile(field, index)} aria-label={`Remove ${file.name}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-rose-700 hover:bg-rose-50"><Trash2 size={20} /></button></div>)}</div>
        <FieldError message={error} />
      </article>
    );
  };

  const otpError = (touched.otp || submitted) && !otpState.verified ? (otpState.sent && otp.length !== 6 ? "Enter the 6-digit OTP." : "Mobile OTP verification is required.") : "";

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-6">
      <SectionCard icon={Info} title="Service Information" description="Please confirm the service before filling the application.">
        <div className="rounded-xl bg-blue-50 p-4"><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Service Name</p><p className="mt-1 text-xl font-bold text-slate-900">{service.title}{variant ? ` - ${variant.title}` : ""}</p>{(form.description || variant?.description || service.description) && <p className="mt-2 leading-6 text-slate-600">{form.description || variant?.description || service.description}</p>}</div>
      </SectionCard>

      <SectionCard icon={UserRound} title="Applicant Details" description="Enter the applicant's name and verify the mobile number.">
        {applicantFields.map((field) => <div key={field.name}>{renderField(field)}{field.name === "mobileNumber" && <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">{!otpState.verified && <button type="button" disabled={!/^[6-9]\d{9}$/.test(values.mobileNumber || "") || countdown > 0} onClick={sendOtp} className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{otpState.sent ? countdown ? `Resend OTP in ${countdown}s` : "Resend OTP" : "Send OTP"}</button>}{otpState.sent && !otpState.verified && <><input aria-label="Enter six digit OTP" inputMode="numeric" maxLength="6" value={otp} onChange={(event) => { setOtp(event.target.value.replace(/\D/g, "").slice(0, 6)); setOtpRequestError(""); }} onBlur={() => setTouched((current) => ({ ...current, otp: true }))} placeholder="6-digit OTP" aria-invalid={Boolean(otpError || otpRequestError)} className={`${inputClass} mt-0 sm:w-44 ${otpError || otpRequestError ? invalidInputClass : ""}`} /><button type="button" onClick={verifyOtp} disabled={otp.length !== 6} className="min-h-12 rounded-xl border-2 border-blue-700 px-5 py-3 font-bold text-blue-700 disabled:opacity-40">Verify OTP</button></>}{otpState.verified && <span className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-50 px-4 font-bold text-emerald-700"><CheckCircle2 /> Mobile verified</span>}</div>{otpState.developmentOtp && <p className="mt-3 text-xs font-medium text-amber-700">Development OTP: {otpState.developmentOtp}. It is never returned in production.</p>}<FieldError message={otpRequestError || otpError} /></div>}</div>)}
      </SectionCard>

      {serviceFields.length > 0 && <SectionCard icon={ClipboardList} title="Service Details" description="Only information required for this service is shown.">{serviceFields.map((field) => <div key={field.name}>{renderField(field)}</div>)}</SectionCard>}

      <SectionCard icon={Files} title="Required Documents" description="Upload each required document. JPG, PNG and PDF files up to 10 MB are accepted.">
        {documentFields.length ? documentFields.map(renderDocument) : <p className="rounded-xl bg-slate-50 p-4 text-slate-600">No required documents are configured for this service.</p>}
      </SectionCard>

      {form.allowAdditionalDocuments !== false && <SectionCard icon={FolderPlus} title="Additional Documents" description={`Add supporting documents only if needed. You can add up to ${extraLimit}.`} optional>
        <div className="space-y-4">{extras.map((item, index) => {
          const errors = extraErrors[item.id] || {};
          return <article key={item.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5"><div className="flex items-center justify-between"><h3 className="font-bold">Additional Document {index + 1}</h3><button type="button" onClick={() => removeExtra(item.id)} className="flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-rose-700 hover:bg-rose-50"><Trash2 size={19} /> Remove</button></div><label className="mt-4 block font-bold" htmlFor={`extra-name-${item.id}`}>Document Name <span className="text-rose-600">*</span></label><input id={`extra-name-${item.id}`} value={item.label} onChange={(event) => { const label = event.target.value; setExtras((current) => current.map((entry) => entry.id === item.id ? { ...entry, label } : entry)); setExtraErrors((current) => ({ ...current, [item.id]: { ...current[item.id], label: label.trim() ? "" : "Enter a document name." } })); }} onBlur={() => setExtraErrors((current) => ({ ...current, [item.id]: { ...current[item.id], label: item.label.trim() ? "" : "Enter a document name." } }))} placeholder="Example: Affidavit" aria-invalid={Boolean(errors.label)} className={`${inputClass} ${errors.label ? invalidInputClass : ""}`} /><FieldError message={errors.label} /><label className="mt-4 flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 px-4 py-3 text-center font-bold text-blue-700"><Upload size={21} /> {item.file ? "Replace file" : "Choose file"}<input type="file" accept="image/jpeg,image/png,application/pdf" capture="environment" className="sr-only" onChange={(event) => updateExtraFile(item.id, event.target.files[0])} aria-invalid={Boolean(errors.file)} /></label>{item.file && <div className="mt-3 flex items-center gap-3 rounded-xl border p-3"><FilePreview file={item.file} /><div className="min-w-0"><p className="truncate font-semibold">{item.file.name}</p><p className="text-xs text-slate-500">{formatSize(item.file.size)} · Ready</p></div></div>}<FieldError message={errors.file} /></article>;
        })}</div>
        <button type="button" onClick={addExtra} disabled={extras.length >= extraLimit} className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-700 px-5 py-3 font-bold text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"><Plus /> Add Document / दस्तावेज़ जोड़ें</button>
        {extras.length >= extraLimit && <p className="text-sm font-medium text-amber-700">Maximum {extraLimit} additional documents allowed.</p>}
      </SectionCard>}

      <SectionCard icon={MessageSquareText} title="Additional Details" description="Share any useful instructions or information for the service team." optional>
        <label htmlFor="additionalDetails" className="sr-only">Additional details</label><textarea id="additionalDetails" rows="6" maxLength="2000" value={values.additionalDetails || ""} onChange={(event) => setValue("additionalDetails", event.target.value)} placeholder="Type any additional information here..." className={inputClass} /><p className="text-right text-xs text-slate-500">{String(values.additionalDetails || "").length}/2000</p>
      </SectionCard>

      <SectionCard icon={ShieldCheck} title="Terms & Declaration" description="Confirm the declaration and complete the security check.">
        <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${submitted && !values.termsAccepted ? "border-rose-300 bg-rose-50" : "border-slate-200"}`}><input type="checkbox" checked={values.termsAccepted === true} onChange={(event) => setValue("termsAccepted", event.target.checked)} className="mt-1 h-6 w-6 shrink-0 accent-blue-700" aria-invalid={submitted && !values.termsAccepted} /><span className="text-sm leading-6">I confirm that the information and documents submitted by me are correct to the best of my knowledge.<br /><span className="text-slate-600">मैं घोषणा करता/करती हूँ कि मेरे द्वारा दी गई जानकारी और दस्तावेज़ मेरी जानकारी के अनुसार सही हैं।</span> <a href={form.termsUrl || "/terms"} className="font-bold text-blue-700 underline">Terms and Conditions</a></span></label>
        {submitted && !values.termsAccepted && <FieldError message="Accept the declaration before submitting." />}
        <CaptchaChallenge onToken={setCaptchaToken} />
        {submitted && !captchaToken && <FieldError message="Complete CAPTCHA verification before submitting." />}
      </SectionCard>

      {formError && <p role="alert" aria-live="assertive" className="rounded-xl border border-rose-200 bg-rose-50 p-4 font-medium text-rose-800">{formError}</p>}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/95 p-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <button type="submit" disabled={isSubmitting} className="min-h-14 w-full rounded-xl bg-blue-700 px-6 py-4 text-lg font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? "Submitting…" : "Submit Application / आवेदन जमा करें"}</button>
      </div>
    </form>
  );
};

export default DynamicForm;
