import { Link } from 'react-router-dom';

/** Visible breadcrumb trail; pair with breadcrumbSchema() in <Seo> for the structured-data twin. */
export default function Breadcrumbs({ items, light = false }) {
  const base = light ? 'text-gray-400' : 'text-gray-500';
  const link = light ? 'hover:text-secondary' : 'hover:text-primary';
  return (
    <nav aria-label="Breadcrumb" className={`text-xs sm:text-sm ${base}`}>
      <ol className="flex flex-wrap items-center justify-center gap-1.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-1.5">
              {last ? (
                <span aria-current="page" className={light ? 'text-white' : 'text-dark'}>{item.name}</span>
              ) : (
                <Link to={item.path} className={`${link} transition-colors`}>{item.name}</Link>
              )}
              {!last && <span aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
