"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

export type AppSelectOption = {
  value: string;
  label: string;
  hint?: string;
  color?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  className?: string;
  buttonClassName?: string;
  searchable?: boolean;
  disabled?: boolean;
};

export default function AppSelect({ value, onChange, options, placeholder = "اختر...", ariaLabel, id, className = "", buttonClassName = "", searchable = false, disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 240, up: false });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((option) => `${option.label} ${option.hint ?? ""}`.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, 230);
    const menuHeight = Math.min(300, filtered.length * 38 + (searchable ? 52 : 16) + 12);
    const up = rect.bottom + menuHeight + 10 > window.innerHeight && rect.top > menuHeight;
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    setPosition({ top: up ? Math.max(8, rect.top - menuHeight - 5) : rect.bottom + 5, left, width, up });
  }, [filtered.length, searchable]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => updatePosition());
    const onDocument = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onScroll = () => updatePosition();
    document.addEventListener("mousedown", onDocument);
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    const timer = setTimeout(() => searchRef.current?.focus(), 30);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", onDocument);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
      clearTimeout(timer);
    };
  }, [open, updatePosition]);

  const choose = (option: AppSelectOption) => {
    onChange(option.value);
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { setOpen(true); setActive(0); return; }
      setActive((current) => (event.key === "ArrowDown" ? Math.min(filtered.length - 1, current + 1) : Math.max(0, current - 1)));
    } else if (event.key === "Enter" || event.key === " ") {
      if (!open) { event.preventDefault(); setOpen(true); return; }
      if (event.key === "Enter" && filtered[active]) { event.preventDefault(); choose(filtered[active]); }
    } else if (event.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const menu = open ? (
    <div ref={menuRef} className={`app-select-menu ${position.up ? "up" : "down"}`} style={{ top: position.top, left: position.left, width: position.width }} role="listbox" id={listId} dir="rtl">
      {searchable && <div className="app-select-search"><Search size={14} /><input ref={searchRef} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} onKeyDown={onKeyDown} placeholder="بحث..." aria-label="بحث في القائمة" /></div>}
      <div className="app-select-options">
        {filtered.map((option, index) => (
          <button key={option.value} type="button" role="option" aria-selected={option.value === value} className={`app-select-option ${option.value === value ? "selected" : ""} ${index === active ? "active" : ""}`} onMouseEnter={() => setActive(index)} onClick={() => choose(option)}>
            {option.color && <span className="app-select-dot" style={{ background: option.color }} />}
            <span className="app-select-label">{option.label}{option.hint && <small>{option.hint}</small>}</span>
            {option.value === value && <Check size={15} />}
          </button>
        ))}
        {filtered.length === 0 && <div className="app-select-empty">لا توجد نتائج</div>}
      </div>
    </div>
  ) : null;

  return (
    <div className={`app-select ${className}`}>
      <button ref={triggerRef} id={id} type="button" className={`app-select-trigger ${buttonClassName} ${open ? "open" : ""}`} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} disabled={disabled} onClick={() => { setOpen((current) => !current); setQuery(""); setActive(Math.max(0, options.findIndex((option) => option.value === value))); }} onKeyDown={onKeyDown}>
        <span className="app-select-value">{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} className="app-select-chevron" />
      </button>
      {menu && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </div>
  );
}
