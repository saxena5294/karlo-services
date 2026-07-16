import { Link } from "react-router-dom";

const ApplicationTable = ({ applications, columns, getRowLink, renderMobile }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="divide-y divide-slate-200 md:hidden">
      {applications.map((application) => (
        <article key={application._id} className="p-5">
          {renderMobile(application)}
          <Link
            to={getRowLink(application)}
            className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline"
          >
            View details →
          </Link>
        </article>
      ))}
    </div>
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map(({ label, headerClassName = "" }) => (
              <th key={label} className={`px-5 py-4 ${headerClassName}`}>{label}</th>
            ))}
            <th className="px-5 py-4"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {applications.map((application) => (
            <tr key={application._id} className="hover:bg-slate-50">
              {columns.map(({ label, render, cellClassName = "" }) => (
                <td key={label} className={`px-5 py-4 ${cellClassName}`}>{render(application)}</td>
              ))}
              <td className="px-5 py-4 text-right">
                <Link to={getRowLink(application)} className="font-semibold text-blue-700 hover:underline">View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default ApplicationTable;
