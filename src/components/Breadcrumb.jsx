import { FiHome, FiChevronRight } from "react-icons/fi";

export default function Breadcrumb({ items = [] }) {
  return (
    <nav
      className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500"
      aria-label="Breadcrumb"
    >
      <FiHome className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={`${item}-${i}`} className="flex items-center gap-1.5">
            <FiChevronRight className="h-3 w-3 shrink-0 text-slate-300 dark:text-slate-600" />
            <span className={isLast
              ? "font-semibold text-slate-700 dark:text-slate-200 font-display"
              : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-default"
            }>
              {item}
            </span>
          </span>
        );
      })}
    </nav>
  );
}
