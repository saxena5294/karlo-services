import { useState } from "react";

const inputClass = "mt-2 min-w-0 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

const DynamicForm = ({ fields = [], isSubmitting, onSubmit }) => {
  const [values, setValues] = useState({});
  const [validationError, setValidationError] = useState("");

  const setValue = (name, value) => setValues((current) => ({ ...current, [name]: value }));

  const toggleCheckbox = (name, optionValue, checked) => {
    const selected = Array.isArray(values[name]) ? values[name] : [];
    setValue(name, checked ? [...new Set([...selected, optionValue])] : selected.filter((item) => item !== optionValue));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const missing = fields.find((field) => {
      if (!field.required) return false;
      const value = values[field.name];
      if (field.type === "file") return !value?.length;
      if (Array.isArray(value)) return !value.length;
      return value === undefined || value === null || String(value).trim() === "";
    });
    if (missing) {
      setValidationError(`${missing.label} is required.`);
      return;
    }

    setValidationError("");
    const formData = new FormData();
    fields.forEach((field) => {
      const value = values[field.name];
      if (field.type === "file") {
        Array.from(value || []).forEach((file) => formData.append(field.name, file));
      } else if (Array.isArray(value)) {
        value.forEach((item) => formData.append(field.name, item));
      } else if (value !== undefined && value !== "") {
        formData.append(field.name, value);
      }
    });
    onSubmit(formData);
  };

  const renderField = (field) => {
    const common = {
      id: field.name,
      name: field.name,
      required: field.required,
      disabled: isSubmitting,
    };

    if (field.type === "textarea") {
      return <textarea {...common} rows="4" placeholder={field.placeholder} value={values[field.name] || ""} onChange={(event) => setValue(field.name, event.target.value)} className={inputClass} />;
    }
    if (field.type === "select") {
      return (
        <select {...common} value={values[field.name] || ""} onChange={(event) => setValue(field.name, event.target.value)} className={inputClass}>
          <option value="">Select an option</option>
          {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      );
    }
    if (field.type === "radio") {
      return <div className="mt-3 flex flex-wrap gap-3">{field.options.map((option) => (
        <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <input type="radio" name={field.name} value={option.value} checked={values[field.name] === option.value} onChange={() => setValue(field.name, option.value)} required={field.required} disabled={isSubmitting} />
          <span>{option.label}</span>
        </label>
      ))}</div>;
    }
    if (field.type === "checkbox") {
      const options = field.options?.length ? field.options : [{ label: field.label, value: "true" }];
      return <div className="mt-3 space-y-2">{options.map((option, index) => (
        <label key={option.value} htmlFor={`${field.name}-${index}`} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <input id={`${field.name}-${index}`} name={field.name} type="checkbox" value={option.value} checked={(values[field.name] || []).includes(option.value)} onChange={(event) => toggleCheckbox(field.name, option.value, event.target.checked)} disabled={isSubmitting} className="mt-1" />
          <span>{option.label}</span>
        </label>
      ))}</div>;
    }
    if (field.type === "file") {
      return <input {...common} type="file" accept={field.accept} multiple={field.multiple} onChange={(event) => setValue(field.name, event.target.files)} className={`${inputClass} max-w-full overflow-hidden file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700`} />;
    }

    return <input {...common} type={field.type} placeholder={field.placeholder} min={field.min} max={field.max} step={field.step} value={values[field.name] || ""} onChange={(event) => setValue(field.name, event.target.value)} className={inputClass} />;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {fields.map((field) => (
        <div key={field._id || field.name}>
          <label htmlFor={field.name} className="block font-semibold text-slate-800">
            {field.label}{field.required && <span className="ml-1 text-red-600">*</span>}
          </label>
          {renderField(field)}
          {field.helpText && <p className="mt-2 text-sm text-slate-500">{field.helpText}</p>}
        </div>
      ))}
      {validationError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{validationError}</p>}
      <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-blue-700 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
        {isSubmitting ? "Submitting application..." : "Submit application"}
      </button>
    </form>
  );
};

export default DynamicForm;
