import { Fragment } from "react";
import type { BranchInsightsResponse } from "../types";

type BranchInsightsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  data: BranchInsightsResponse | null;
  collegeName: string;
  branchName: string;
};

const SectionTitle = ({ children }: { children: string }) => (
  <h3 className="text-lg font-semibold text-slate-900 dark:text-gray-100 mb-2">
    {children}
  </h3>
);

const BranchInsightsModal = ({
  isOpen,
  onClose,
  loading,
  error,
  data,
  collegeName,
  branchName,
}: BranchInsightsModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-3 sm:px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-50 w-full max-w-3xl max-h-[85vh] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-sky-600 dark:text-sky-300 font-semibold">
              Branch Insights
            </p>
            <h2 className="mt-1 text-base sm:text-lg font-semibold text-slate-900 dark:text-gray-100">
              {branchName} – {collegeName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full p-1.5 text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 py-4 overflow-y-auto text-sm space-y-4 text-slate-700 dark:text-gray-200">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500 dark:text-gray-400">
              <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p>Loading curated branch insights…</p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40 px-3 py-3 text-sm text-rose-700 dark:text-rose-200">
              <p className="font-semibold mb-1">Unable to load insights</p>
              <p className="mb-2">{error}</p>
              <p className="text-xs text-rose-800/80 dark:text-rose-200/80">
                Try again after some time or cross-check details from the
                official college website and recent placement reports.
              </p>
            </div>
          )}

          {!loading && !error && data && (
            <Fragment>
              {/* 1. About the Branch */}
              <section>
                <SectionTitle>1. About the Branch</SectionTitle>
                <p className="leading-relaxed whitespace-pre-line">
                  {data.about}
                </p>
              </section>

              {/* 2. Admission & Cutoffs */}
              <section>
                <SectionTitle>2. Admission & Cutoffs (KCET)</SectionTitle>
                <p className="leading-relaxed whitespace-pre-line">
                  {data.admission_cutoffs}
                </p>
              </section>

              {/* 3. Placements */}
              <section>
                <SectionTitle>3. Placements (Approximate)</SectionTitle>
                <p className="leading-relaxed whitespace-pre-line">
                  {data.placements}
                </p>
              </section>

              {/* 4. Pros & Cons */}
              <section>
                <SectionTitle>4. Pros & Cons</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 px-3 py-2">
                    <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-200 mb-1">
                      Pros
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {data.pros_cons.pros.length ? (
                        data.pros_cons.pros.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))
                      ) : (
                        <li>No clear pros were highlighted from web results.</li>
                      )}
                    </ul>
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800 px-3 py-2">
                    <p className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-200 mb-1">
                      Cons / Watch-outs
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {data.pros_cons.cons.length ? (
                        data.pros_cons.cons.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))
                      ) : (
                        <li>No major concerns were clearly reported online.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </section>

              {/* 5. Key Features */}
              <section>
                <SectionTitle>5. Key Features of this Branch</SectionTitle>
                {data.features.length ? (
                  <ul className="list-disc list-inside space-y-1">
                    {data.features.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-gray-400">
                    Key highlights specific to this college were not clearly
                    available from the web.
                  </p>
                )}
              </section>

              {/* 6. One-Line Summary */}
              <section>
                <SectionTitle>6. One-Line Summary</SectionTitle>
                <p className="italic text-slate-800 dark:text-gray-100">
                  “{data.one_line_summary}”
                </p>
              </section>

              {/* 7. Additional Useful Information */}
              <section className="mb-2">
                <SectionTitle>
                  7. Additional Useful Information for Freshers
                </SectionTitle>
                {data.additional_info.length ? (
                  <ul className="list-disc list-inside space-y-1">
                    {data.additional_info.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-gray-400">
                    No extra fresher-specific insights were confidently extracted
                    from online sources.
                  </p>
                )}
              </section>

              <p className="text-[11px] text-slate-500 dark:text-gray-500 border-t border-dashed border-slate-200 dark:border-slate-700 pt-2">
                This summary is curated for KCET students. Treat packages and
                cutoffs as approximate and always cross-verify with official
                college data and latest KCET documents.
              </p>
            </Fragment>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchInsightsModal;


