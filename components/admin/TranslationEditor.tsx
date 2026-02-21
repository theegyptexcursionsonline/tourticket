'use client';

import { useState } from 'react';
import { Globe, Plus, Minus } from 'lucide-react';
import {
  TranslationFieldDef,
  translatableLocales,
  localeNames,
  isRTL,
} from '@/lib/i18n/translationFields';

const inputStyles =
  'block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm disabled:bg-slate-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-slate-700';

const textareaStyles = inputStyles + ' resize-vertical min-h-[100px]';

// ── Types ──

interface TranslationEditorProps {
  fields: TranslationFieldDef[];
  value: Record<string, Record<string, unknown>>;
  onChange: (translations: Record<string, Record<string, unknown>>) => void;
}

// ── Helpers ──

/** Remove locales where every value is empty */
function stripEmptyLocales(
  translations: Record<string, Record<string, unknown>>
): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  for (const [locale, fields] of Object.entries(translations)) {
    const hasContent = Object.values(fields).some((v) => {
      if (Array.isArray(v)) return v.some((item) => String(item).trim());
      return typeof v === 'string' && v.trim();
    });
    if (hasContent) result[locale] = fields;
  }
  return result;
}

// ── Component ──

export default function TranslationEditor({
  fields,
  value,
  onChange,
}: TranslationEditorProps) {
  const [activeLocale, setActiveLocale] = useState(translatableLocales[0]);

  const rtl = isRTL(activeLocale);
  const localeData = (value[activeLocale] || {}) as Record<string, unknown>;

  // ── Field updaters ──

  const updateField = (fieldKey: string, fieldValue: unknown) => {
    const updated = { ...value };
    updated[activeLocale] = { ...localeData, [fieldKey]: fieldValue };
    onChange(stripEmptyLocales(updated));
  };

  const getStringValue = (fieldKey: string): string =>
    typeof localeData[fieldKey] === 'string' ? (localeData[fieldKey] as string) : '';

  const getArrayValue = (fieldKey: string): string[] =>
    Array.isArray(localeData[fieldKey])
      ? (localeData[fieldKey] as string[])
      : [];

  const addArrayItem = (fieldKey: string) => {
    const arr = [...getArrayValue(fieldKey), ''];
    updateField(fieldKey, arr);
  };

  const removeArrayItem = (fieldKey: string, index: number) => {
    const arr = getArrayValue(fieldKey).filter((_, i) => i !== index);
    updateField(fieldKey, arr);
  };

  const updateArrayItem = (fieldKey: string, index: number, val: string) => {
    const arr = [...getArrayValue(fieldKey)];
    arr[index] = val;
    updateField(fieldKey, arr);
  };

  // ── Count filled fields per locale ──

  const countFilledFields = (locale: string): number => {
    const data = value[locale];
    if (!data) return 0;
    return Object.values(data).filter((v) => {
      if (Array.isArray(v)) return v.some((item) => String(item).trim());
      return typeof v === 'string' && v.trim();
    }).length;
  };

  // ── Render ──

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-indigo-500" />
        <span className="text-sm font-bold text-slate-700">Translations</span>
        <span className="text-slate-400 text-sm">(optional)</span>
      </div>

      {/* Locale tabs */}
      <div className="flex flex-wrap border-b border-slate-200 bg-slate-50 rounded-t-xl px-2">
        {translatableLocales.map((locale) => {
          const count = countFilledFields(locale);
          return (
            <button
              key={locale}
              type="button"
              onClick={() => setActiveLocale(locale)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                activeLocale === locale
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white rounded-t-lg'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {localeNames[locale] || locale}
              <span className="text-xs text-slate-400">({locale})</span>
              {count > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-5 min-w-[20px] px-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-600">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Fields for active locale */}
      <div className="space-y-5 pt-2" dir={rtl ? 'rtl' : 'ltr'}>
        {fields.map((field) => {
          if (field.type === 'array') {
            return (
              <ArrayField
                key={field.key}
                field={field}
                items={getArrayValue(field.key)}
                rtl={rtl}
                onAdd={() => addArrayItem(field.key)}
                onRemove={(i) => removeArrayItem(field.key, i)}
                onUpdate={(i, v) => updateArrayItem(field.key, i, v)}
              />
            );
          }

          const val = getStringValue(field.key);

          if (field.type === 'textarea') {
            return (
              <div key={field.key} className="space-y-1.5">
                <FieldLabel label={field.label} />
                <textarea
                  value={val}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  rows={field.rows || 3}
                  maxLength={field.maxLength}
                  className={`${textareaStyles}${rtl ? ' text-right' : ''}`}
                  placeholder={`${field.label} in ${localeNames[activeLocale] || activeLocale}`}
                />
                {field.maxLength && (
                  <CharCounter current={val.length} max={field.maxLength} />
                )}
              </div>
            );
          }

          // Default: input
          return (
            <div key={field.key} className="space-y-1.5">
              <FieldLabel label={field.label} />
              <input
                type="text"
                value={val}
                onChange={(e) => updateField(field.key, e.target.value)}
                maxLength={field.maxLength}
                className={`${inputStyles}${rtl ? ' text-right' : ''}`}
                placeholder={`${field.label} in ${localeNames[activeLocale] || activeLocale}`}
              />
              {field.maxLength && (
                <CharCounter current={val.length} max={field.maxLength} />
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 pt-1">
        Only fill in fields you want to translate. Empty fields fall back to the English (default) value.
      </p>
    </div>
  );
}

// ── Sub-components ──

function FieldLabel({ label }: { label: string }) {
  return (
    <label className="text-sm font-semibold text-slate-600">{label}</label>
  );
}

function CharCounter({ current, max }: { current: number; max: number }) {
  return (
    <div className="text-xs text-slate-400 text-right">
      {current}/{max}
    </div>
  );
}

function ArrayField({
  field,
  items,
  rtl,
  onAdd,
  onRemove,
  onUpdate,
}: {
  field: TranslationFieldDef;
  items: string[];
  rtl: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <FieldLabel label={field.label} />
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-slate-400 italic">No items yet. Click &quot;Add&quot; to start.</p>
      )}

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => onUpdate(index, e.target.value)}
              maxLength={field.maxLength}
              className={`${inputStyles}${rtl ? ' text-right' : ''}`}
              placeholder={`${field.label} item ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="flex items-center justify-center w-10 h-10 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
