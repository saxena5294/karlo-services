const App = () => {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-2xl rounded-2xl bg-white p-8 text-center shadow-lg">
        <div className="mb-4 inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
          Karlo Services
        </div>

        <h1 className="text-4xl font-bold text-slate-900">
          Your Digital Jan Seva Kendra
        </h1>

        <p className="mt-4 text-lg leading-8 text-slate-600">
          Apply for government and professional services through one trusted
          platform.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold">Customer</h2>
            <p className="mt-2 text-sm text-slate-500">
              Apply and track services
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold">Retailer</h2>
            <p className="mt-2 text-sm text-slate-500">
              Process customer applications
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold">Admin</h2>
            <p className="mt-2 text-sm text-slate-500">
              Control the entire platform
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default App;