import { ChevronDown, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getDeclarationForms } from "../../api/declarationFormsApi";

const supportsHover = () => (
  typeof window !== "undefined"
  && window.matchMedia("(hover: hover) and (pointer: fine)").matches
);

const DeclarationFormsMenu = ({ portal, onNavigate }) => {
  const location = useLocation();
  const [open, setOpen] = useState(location.pathname.includes("/declaration-forms"));
  const [forms, setForms] = useState([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const closeTimer = useRef(null);
  const allFormsPath = `/${portal}/declaration-forms`;

  useEffect(() => {
    let current = true;
    getDeclarationForms({ popular: true, limit: 5 })
      .then(({ forms: items }) => {
        if (current) setForms(items);
      })
      .catch(() => {
        if (current) setLoadFailed(true);
      });
    return () => {
      current = false;
      window.clearTimeout(closeTimer.current);
    };
  }, []);

  const openOnHover = () => {
    if (!supportsHover()) return;
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeOnHover = () => {
    if (!supportsHover()) return;
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  return (
    <div onMouseEnter={openOnHover} onMouseLeave={closeOnHover}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${portal}-declaration-menu`}
        onClick={() => setOpen((value) => !value)}
        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
          location.pathname === allFormsPath
            ? "bg-blue-50 text-blue-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        <FileText size={20} aria-hidden="true" />
        <span className="min-w-0 flex-1">Declaration Forms</span>
        <ChevronDown
          size={17}
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          id={`${portal}-declaration-menu`}
          className="ml-5 mt-1 space-y-1 border-l border-slate-200 pl-3"
        >
          {forms.map((form) => (
            <Link
              key={form._id}
              to={`${allFormsPath}?search=${encodeURIComponent(form.title)}`}
              onClick={onNavigate}
              className="block truncate rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600"
              title={form.title}
            >
              {form.title}
            </Link>
          ))}
          {!forms.length && (
            <p className="px-3 py-2 text-xs text-slate-400">
              {loadFailed ? "Forms unavailable" : "No popular forms"}
            </p>
          )}
          <Link
            to={allFormsPath}
            onClick={onNavigate}
            className="block rounded-lg px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            View All
          </Link>
        </div>
      )}
    </div>
  );
};

export default DeclarationFormsMenu;

