// Minimal investigations view for P0 (filters + cards land in P7).
export default function InvestigationsPage() {
  return (
    <div className="max-w-[1100px] px-10 pb-16 pt-[34px]">
      <div className="dt-eyebrow mb-2">Cross-client queue</div>
      <h1 className="mb-[22px] text-[30px] font-bold tracking-tight text-ink-1">Investigations</h1>
      <div className="rounded-[14px] border border-ink-7 bg-ink-10 px-10 py-16 text-center text-sm text-ink-4">
        Nothing to investigate.
      </div>
    </div>
  );
}
