
export default function Footer() {
  return (
    <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors duration-200 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-6 md:flex md:items-center md:justify-between lg:px-8">
        <div className="flex flex-col space-y-2 md:space-y-0 md:flex-row md:items-center md:space-x-6 text-center md:text-left">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} KCET EduGuide. All rights reserved.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Built by 3rd-year students of RV College of Engineering.
          </p>
        </div>
        <div className="mt-4 md:mt-0 max-w-xl">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center md:text-right leading-relaxed">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Disclaimer:</span>{' '}
            The cutoffs are taken only from the official KCET counselling website. For further confirmation, you may visit the{' '}
            <a
              href="https://cetonline.karnataka.gov.in/kea/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 underline underline-offset-2"
            >
              official KCET website
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  )
}
