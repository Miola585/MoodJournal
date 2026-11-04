import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, CalendarDays, ChevronDown, LockKeyhole, Palette, Sparkles, UserRound, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { mainDestinations, sectionForView, sectionTabs } from '../../data/appNavigation';

const icons = { BookOpen, CalendarDays, Sparkles };

export function PageBack({ onBack, children = 'Little breaks' }) {
  return <button className="page-back" type="button" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" />{children}</button>;
}

export function AppNav({ activeView, onOpen, variant = 'top' }) {
  const section = sectionForView(activeView);
  const location = useLocation();
  const [open, setOpen] = useState(null);
  const root = useRef(null);
  const triggers = useRef({});
  const panel = useRef(null);
  const openedByKeyboard = useRef(false);
  const close = (restore = false) => {
    if (restore) triggers.current[open]?.focus();
    setOpen(null);
  };
  useEffect(() => { setOpen(null); }, [location.key]);
  useEffect(() => {
    if (!open) return undefined;
    if (openedByKeyboard.current) panel.current?.querySelector('button[data-destination]')?.focus();
    const dismiss = (event) => {
      if (event.type === 'keydown' && event.key === 'Escape') {
        event.preventDefault();
        triggers.current[open]?.focus();
        setOpen(null);
      }
      if (event.type === 'pointerdown' && !root.current?.contains(event.target)) setOpen(null);
    };
    const resize = () => setOpen(null);
    document.addEventListener('keydown', dismiss);
    document.addEventListener('pointerdown', dismiss);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('keydown', dismiss);
      document.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('resize', resize);
    };
  }, [open]);
  const moveFocus = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = [...panel.current.querySelectorAll('button[data-destination]')];
    const index = items.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    event.preventDefault();
    items[next]?.focus();
  };
  return <nav ref={root} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null); }} className={`destination-nav destination-nav-${variant}`} aria-label={variant === 'mobile' ? 'Mobile destinations' : 'Main destinations'}>
    {mainDestinations.map((item) => {
      const Icon = icons[item.icon];
      const children = sectionTabs[item.section];
      return <div className="destination-group" key={item.view}>
        <button ref={(node) => { triggers.current[item.section] = node; }} type="button" className={section === item.section ? 'active' : ''} aria-current={section === item.section ? 'page' : undefined} aria-expanded={children ? open === item.section : undefined} aria-controls={children ? `${variant}-${item.section}-destinations` : undefined} onKeyDown={(event) => { if (children && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); openedByKeyboard.current = true; setOpen(item.section); } }} onClick={(event) => { openedByKeyboard.current = event.detail === 0; children ? setOpen(open === item.section ? null : item.section) : onOpen(item.view); }}><Icon aria-hidden="true" size={19} /><span>{item.label}</span>{children && <ChevronDown className="destination-chevron" aria-hidden="true" size={13} />}</button>
        {children && open === item.section && <div ref={panel} id={`${variant}-${item.section}-destinations`} className="destination-menu" onKeyDown={moveFocus}>
          {variant === 'mobile' && <div className="destination-menu-heading"><strong>{item.label}</strong><button type="button" className="icon-button" aria-label={`Close ${item.label} menu`} onClick={() => close(true)}><X size={18} /></button></div>}
          {children.map((child) => <button data-destination key={`${child.view}-${child.tool || ''}`} type="button" aria-current={activeView === child.view && (!child.tool || new URLSearchParams(location.search).get('tool') === child.tool) ? 'page' : undefined} onClick={() => { close(true); onOpen(child.view, null, null, child.tool); }}>{child.label}</button>)}
        </div>}
      </div>;
    })}
  </nav>;
}

export function SettingsNavigation({ activeView, onOpen, onBack }) {
  return <aside className="settings-navigation">
    <button className="page-back" type="button" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" />Back</button>
    <nav aria-label="Your settings">{[
      ['profile', 'Profile', UserRound], ['preferences', 'Preferences', Palette], ['privacy', 'Privacy', LockKeyhole]
    ].map(([view, label, Icon]) => <button type="button" key={view} aria-current={activeView === view ? 'page' : undefined} onClick={() => onOpen(view)}><Icon size={20} aria-hidden="true" />{label}</button>)}</nav>
  </aside>;
}

export function ProfileMenu({ activeView, onOpen, isAdmin, moreActions, count = 0, error = '' }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  useEffect(() => { setOpen(false); }, [activeView]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === 'keydown' && event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
      if (event.type === 'pointerdown' && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', close);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', close); };
  }, [open]);
  return <div className="profile-menu" ref={root} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={(event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    if (event.target.matches('input, select, textarea')) return;
    event.preventDefault();
    if (!open) { setOpen(true); return; }
    const items = [...root.current.querySelectorAll('nav button')];
    const index = items.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }}>
    <button ref={trigger} className="icon-button" type="button" aria-label="Profile menu" title="Profile menu" aria-expanded={open} aria-controls="profile-navigation" onClick={() => setOpen(!open)}><UserRound aria-hidden="true" size={21} /></button>
    {open && <nav id="profile-navigation" className="profile-menu-popover" aria-label="Account and help">
      {[['profile', 'Profile'], ['preferences', 'Preferences'], ['privacy', 'Privacy'], ['about', 'About'], ['support', 'Help & feedback'], ...(isAdmin ? [['admin', 'Admin'], ['gameArchive', 'Game archive']] : [])].map(([view, label]) => <button type="button" key={view} onClick={() => { setOpen(false); onOpen(view); }}>{label}{view === 'admin' && (error ? <span title={error}>!</span> : count > 0 ? <span>{count}</span> : null)}</button>)}
      {moreActions}
    </nav>}
  </div>;
}
