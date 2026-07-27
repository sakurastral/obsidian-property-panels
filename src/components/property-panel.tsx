import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, KeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { Keymap, type TFile } from "obsidian";
import type { LayoutConfig, OptionItem, PanelConfig, PropertyFieldConfig, PropertyValue } from "../types";
import type { PropertyRepository } from "../properties/property-repository";
import type { OptionService } from "../options/option-service";
import { optionSourceKey } from "../options/option-dependency";
import { effectiveColumnSpan } from "./field-layout";
import { shouldRenderField } from "./field-visibility";
import { multiSelectKeyboardResult, ratingKeyboardResult } from "./keyboard-navigation";
import { panelHeaderState } from "./panel-header";
import { optionDisplayText, parseDisplayLink } from "./wiki-link";

interface Props {
  file: TFile; panel: PanelConfig; layout: LayoutConfig;
  repository: PropertyRepository; options: OptionService; saveDelay: number;
}

export function PropertyPanel({ file, panel, layout, repository, options, saveDelay }: Props) {
  const [revision, setRevision] = useState(0);
  const [collapsed, setCollapsed] = useState(panel.defaultCollapsed);
  useEffect(() => repository.subscribe(file, () => setRevision((value) => value + 1)), [file, repository]);
  const effective = { ...layout, ...panel.layout };
  const style = {
    "--property-panels-columns": String(effective.columns),
    "--property-panels-field-gap": `${effective.fieldGap ?? 10}px`
  } as CSSProperties;
  const header = panelHeaderState(panel.name, panel.collapsible, panel.showTitle);
  return (
    <section className={`property-panels-panel property-panels-density-${effective.density} ${panel.cssClass ?? ""}`} style={style}>
      {header.visible && (
        <header className={`property-panels-header${header.title === "" ? " is-titleless" : ""}`}>
          {header.title !== "" && <span className="property-panels-title">{header.title}</span>}
          {panel.collapsible && (
            <button className="property-panels-collapse" type="button" aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? "Show" : "Hide"}
            </button>
          )}
        </header>
      )}
      {!collapsed && (
        <div className={`property-panels-grid property-panels-label-${effective.labelPosition}`}>
          {panel.fields.filter((field) => field.visible).map((field) => (
            <Field key={field.id} field={field} columnCount={effective.columns} file={file} repository={repository} options={options} saveDelay={saveDelay} revision={revision} />
          ))}
        </div>
      )}
    </section>
  );
}

interface FieldProps {
  field: PropertyFieldConfig; file: TFile; repository: PropertyRepository;
  options: OptionService; saveDelay: number; revision: number; columnCount: number;
}

function Field({ field, file, repository, options, saveDelay, revision, columnCount }: FieldProps) {
  const id = useId();
  const style = {
    "--property-panels-field-column-span": String(effectiveColumnSpan(field.columnSpan, columnCount))
  } as CSSProperties;
  if (field.type === "divider") {
    return <div className="property-panels-field property-panels-field-divider" style={style} role="separator"><hr /></div>;
  }
  const label = field.label || field.property;
  const value = repository.read(file, field.property);
  if (!shouldRenderField(field.type, field.showWhenEmpty, value)) return null;
  const labelClass = field.labelDisplay === "hidden" ? "property-panels-visually-hidden" : field.labelDisplay === "icon-only" ? "property-panels-label-icon" : "";
  return (
    <div className={`property-panels-field property-panels-field-${field.type} property-panels-long-${field.longText}`} style={style}>
      <label htmlFor={id} className={labelClass} title={field.labelDisplay === "icon-only" ? label : undefined}>{label}</label>
      <FieldControl id={id} field={field} file={file} value={value} repository={repository} options={options} saveDelay={saveDelay} revision={revision} />
    </div>
  );
}

interface ControlProps extends Omit<FieldProps, "columnCount"> { id: string; value: PropertyValue }

function FieldControl(props: ControlProps) {
  const { field, value, repository, file, id } = props;
  const write = useCallback((next: PropertyValue) => void repository.write(file, field.property, next), [repository, file, field.property]);
  if (field.type === "readonly") return <ReadonlyControl id={id} value={value} file={file} options={props.options} />;
  if (field.type === "toggle") return <input id={id} type="checkbox" checked={Boolean(value)} disabled={!field.editable} onChange={(event) => write(event.target.checked)} />;
  if (field.type === "number") return (
    <input id={id} type="number" value={typeof value === "number" ? value : ""} disabled={!field.editable}
      min={field.number?.min} max={field.number?.max} step={field.number?.step}
      onChange={(event) => write(event.target.value === "" ? null : event.target.valueAsNumber)} />
  );
  if (field.type === "date" || field.type === "datetime") return (
    <input
      id={id}
      type={field.type === "date" ? "date" : "datetime-local"}
      value={dateInputValue(value, field.type)}
      disabled={!field.editable}
      onChange={(event) => write(event.target.value || null)}
    />
  );
  if (field.type === "progress") return <ProgressControl {...props} write={write} />;
  if (field.type === "rating") return <RatingControl {...props} write={write} />;
  if (field.type === "select" || field.type === "multi-select") return <OptionControl {...props} write={write} />;
  return <TextControl {...props} write={write} multiline={field.type === "textarea"} />;
}

function ReadonlyControl({ id, value, file, options }: { id: string; value: PropertyValue; file: TFile; options: OptionService }) {
  if (value == null || (Array.isArray(value) && value.length === 0)) return <output id={id} className="property-panels-readonly">—</output>;
  if (Array.isArray(value)) return (
    <output id={id} className="property-panels-readonly property-panels-chips">
      {value.map((item, index) => (
        <span className="property-panels-chip" key={`${item}:${index}`}>
          <LinkedValue value={item} sourcePath={file.path} options={options} />
        </span>
      ))}
    </output>
  );
  return (
    <output id={id} className="property-panels-readonly">
      <LinkedValue value={String(value)} sourcePath={file.path} options={options} />
    </output>
  );
}

function TextControl({ id, value, field, file, repository, saveDelay, revision, write, multiline }: ControlProps & { write: (value: PropertyValue) => void; multiline: boolean }) {
  const [draft, setDraft] = useState(typeof value === "string" ? value : value == null ? "" : String(value));
  const focused = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!focused.current && !repository.recentlyWritten(file, field.property)) setDraft(typeof value === "string" ? value : value == null ? "" : String(value));
  }, [value, revision, repository, file, field.property]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const update = (next: string) => {
    setDraft(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => write(next), saveDelay);
  };
  const common = {
    id, value: draft, disabled: !field.editable, placeholder: field.placeholder,
    onFocus: () => { focused.current = true; },
    onBlur: () => { focused.current = false; window.clearTimeout(timer.current); write(draft); },
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(event.target.value)
  };
  return multiline ? <textarea {...common} rows={3} /> : <input {...common} type="text" />;
}

function ProgressControl({ id, value, field, write }: ControlProps & { write: (value: PropertyValue) => void }) {
  const config = { min: 0, max: 100, step: 1, display: "percent" as const, showValue: true, ...field.progress };
  const number = typeof value === "number" ? value : config.min;
  const display = config.display === "percent" ? `${Math.round(((number - config.min) / (config.max - config.min)) * 100)}%` : String(number);
  return <div className="property-panels-progress">
    <input id={id} type="range" min={config.min} max={config.max} step={config.step} value={number} disabled={!field.editable} onChange={(event) => write(event.target.valueAsNumber)} />
    {config.showValue && <output>{display}</output>}
  </div>;
}

function RatingControl({ id, value, field, write }: ControlProps & { write: (value: PropertyValue) => void }) {
  const max = field.rating?.max ?? 5;
  const current = typeof value === "number" ? value : 0;
  const [hover, setHover] = useState(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const select = (rating: number) => {
    write(rating);
    buttons.current[rating - 1]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, rating: number) => {
    const result = ratingKeyboardResult(event.key, rating, max, field.rating?.allowClear ?? false);
    if (result.type === "none") return;
    event.preventDefault();
    if (result.type === "clear") write(null);
    else select(result.value);
  };
  return <div id={id} className="property-panels-rating" role="radiogroup" aria-label={field.label || field.property} onMouseLeave={() => setHover(0)}>
    {Array.from({ length: max }, (_, index) => index + 1).map((rating) => (
      <button key={rating} type="button" role="radio" aria-checked={current === rating} aria-label={`${rating} of ${max}`}
        ref={(element) => { buttons.current[rating - 1] = element; }}
        tabIndex={current === rating || (current === 0 && rating === 1) ? 0 : -1}
        disabled={!field.editable} className={rating <= (hover || current) ? "is-active" : ""}
        onMouseEnter={() => setHover(rating)}
        onKeyDown={(event) => onKeyDown(event, rating)}
        onClick={() => write(field.rating?.allowClear && current === rating ? null : rating)}>★</button>
    ))}
  </div>;
}

function OptionControl({ id, value, field, file, options, write }: ControlProps & { write: (value: PropertyValue) => void }) {
  const [items, setItems] = useState<OptionItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const sourceKey = optionSourceKey(field.optionSource);
  useEffect(() => {
    let active = true;
    setStatus("loading");
    setError("");
    void options.load(field.optionSource, { file }).then((loaded) => {
      if (active) { setItems(loaded); setStatus("ready"); }
    }).catch((reason: unknown) => {
      if (active) {
        setStatus("error");
        setError(reason instanceof Error ? reason.message : "Unable to load options.");
      }
    });
    return () => { active = false; };
  }, [sourceKey, file, options]);
  const selected = useMemo(() => Array.isArray(value) ? value.map(String) : value == null ? [] : [String(value)], [value]);
  const combined = uniqueOptions([...items, ...selected.map((item) => ({ value: item, label: item }))]);
  const selectedValue = selected[0] ?? "";
  if (field.type === "select") return <div className="property-panels-select-control">
    <select id={id} value={selectedValue} disabled={!field.editable || status === "loading"} onChange={(event) => write(event.target.value || null)}>
      <option value="">{status === "loading" ? "Loading…" : status === "error" ? error : "—"}</option>
      {combined.map((item) => <option key={item.value} value={item.value}>{optionLabel(item)}</option>)}
    </select>
    {parseDisplayLink(selectedValue) && (
      <LinkedValue value={selectedValue} sourcePath={file.path} options={options} compact />
    )}
  </div>;
  return <MultiSelect id={id} field={field} file={file} options={options} items={combined} selected={selected} status={status} error={error} write={write} />;
}

function MultiSelect({ id, field, file, options, items, selected, status, error, write }: {
  id: string;
  field: PropertyFieldConfig;
  file: TFile;
  options: OptionService;
  items: OptionItem[];
  selected: string[];
  status: string;
  error: string;
  write: (value: PropertyValue) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const input = useRef<HTMLInputElement | null>(null);
  const listId = `${id}-options`;
  const normalizedQuery = query.toLowerCase();
  const filtered = items.filter((item) => !selected.includes(item.value) && optionLabel(item).toLowerCase().includes(normalizedQuery));
  const customValue = query.trim();
  const custom = customValue && filtered.length === 0 && field.allowCustom
    ? { value: customValue, label: `Add “${optionDisplayText(customValue)}”` }
    : null;
  const available = custom ? [custom] : filtered;
  useEffect(() => setActiveIndex((index) => Math.min(index, Math.max(available.length - 1, 0))), [available.length]);
  const add = (item: string) => { if (item && !selected.includes(item)) write([...selected, item]); setQuery(""); setActiveIndex(0); input.current?.focus(); };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const result = multiSelectKeyboardResult(event.key, activeIndex, available.length);
    if (result.type === "none") return;
    event.preventDefault();
    if (result.type === "navigate") setActiveIndex(result.index);
    else if (result.type === "select") {
      const item = available[result.index];
      if (item) add(item.value);
    } else {
      setQuery("");
      setActiveIndex(0);
    }
  };
  return <div id={id} className="property-panels-multiselect">
    <div className="property-panels-chips">{selected.map((item) => (
      <span className="property-panels-chip" key={item}>
        <LinkedValue value={item} sourcePath={file.path} options={options} />
        <button type="button" aria-label={`Remove ${optionDisplayText(item)}`} disabled={!field.editable} onClick={() => write(selected.filter((value) => value !== item))}>×</button>
      </span>
    ))}</div>
    <input ref={input} type="search" value={query} disabled={!field.editable || status === "loading"} placeholder={status === "loading" ? "Loading…" : field.placeholder ?? "Search or add…"}
      role="combobox" aria-autocomplete="list" aria-expanded={Boolean(query)} aria-controls={listId}
      aria-activedescendant={query && available[activeIndex] ? `${listId}-${activeIndex}` : undefined}
      onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
      onKeyDown={onKeyDown} />
    {status === "error" && <div className="property-panels-option-status mod-error" role="alert">{error}</div>}
    {status === "ready" && items.length === 0 && selected.length === 0 && <div className="property-panels-option-status">No options available.</div>}
    {query && <div id={listId} className="property-panels-options" role="listbox">
      {available.map((item, index) => <div id={`${listId}-${index}`} role="option" aria-selected={activeIndex === index}
        className={activeIndex === index ? "is-active" : ""} key={item.value}
        onMouseEnter={() => setActiveIndex(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => add(item.value)}>{optionLabel(item)}</div>)}
      {available.length === 0 && <span>No options</span>}
    </div>}
  </div>;
}

function LinkedValue({ value, sourcePath, options, compact = false }: {
  value: string;
  sourcePath: string;
  options: OptionService;
  compact?: boolean;
}): ReactNode {
  const link = parseDisplayLink(value);
  if (!link) return <span className="property-panels-value-text" title={value}>{value}</span>;
  const open = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
    if (link.kind === "internal") {
      event.preventDefault();
      void options.openLink(link.target, sourcePath, Boolean(Keymap.isModEvent(event.nativeEvent)));
    }
  };
  return (
    <a
      href={link.target}
      className={`${link.kind === "internal" ? "internal-link" : "external-link"} property-panels-link property-panels-value-text${compact ? " property-panels-select-open" : ""}`}
      data-href={link.kind === "internal" ? link.target : undefined}
      target={link.kind === "external" ? "_blank" : undefined}
      rel={link.kind === "external" ? "noopener noreferrer" : undefined}
      aria-label={compact ? `Open ${link.label}` : undefined}
      title={compact ? `Open ${link.label}` : value}
      onClick={open}
    >
      {compact ? "Open" : link.label}
    </a>
  );
}

const optionLabel = (item: OptionItem): string => optionDisplayText(item.label);
const uniqueOptions = (items: OptionItem[]): OptionItem[] => [...new Map(items.map((item) => [item.value, item])).values()];
const dateInputValue = (value: PropertyValue, type: "date" | "datetime"): string => {
  if (typeof value !== "string") return "";
  if (type === "date") return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
  const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  return match?.[1] ?? "";
};
