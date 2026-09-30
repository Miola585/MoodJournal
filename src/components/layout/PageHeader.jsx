export function PageHeader({
  title,
  subtitle,
  eyebrow,
  icon: Icon,
  actions,
  align = 'left',
  className = ''
}) {
  return (
    <header className={`page-header page-header-${align} ${className}`.trim()}>
      <div className="page-header-copy">
        {Icon && <span className="page-header-icon" aria-hidden="true"><Icon size={22} /></span>}
        <div>
          {eyebrow && <span className="page-header-eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}
