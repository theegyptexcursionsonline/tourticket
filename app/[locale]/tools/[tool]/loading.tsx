export default function ToolLoading() {
  return (
    <main className="min-h-[60vh] bg-slate-50 px-4 py-12" aria-busy="true">
      <div role="status" aria-live="polite" className="mx-auto max-w-5xl">
        <span className="sr-only">Loading travel tool…</span>
        <div aria-hidden="true" className="animate-pulse">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="mt-8 h-12 max-w-xl rounded-xl bg-slate-200" />
          <div className="mt-4 h-6 max-w-2xl rounded bg-slate-200" />
          <div className="mt-10 h-[32rem] rounded-2xl border border-slate-200 bg-white" />
        </div>
      </div>
    </main>
  );
}
