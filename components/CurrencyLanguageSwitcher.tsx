'use client';

import React, { useState, useEffect, FC } from 'react';
import { createPortal } from 'react-dom'; // 1. Import createPortal
import { X, Search, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- (Types, Data, and useSettings Hook remain unchanged) ---

// --- 1. TYPE DEFINITIONS ---
interface Currency { code: string; name: string; symbol: string; }
interface Language { code: string; name: string; nativeName: string; }

// --- 2. DATA ---
const currencies: Currency[] = [
  { code: 'USD', name: 'United States Dollar', symbol: '$' }, { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' }, { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
];
const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' }, { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' }, { code: 'de', name: 'German', nativeName: 'Deutsch' },
];

// --- 3. STATE SYNCHRONIZATION & HOOK ---
const eventBus = {
  on: (event: string, callback: EventListener) => document.addEventListener(event, callback),
  dispatch: (event: string, data: any) => document.dispatchEvent(new CustomEvent(event, { detail: data })),
  remove: (event: string, callback: EventListener) => document.removeEventListener(event, callback),
};
const useSettings = () => {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currencies[0]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(languages[0]);
  useEffect(() => {
    const savedCurrencyCode = localStorage.getItem('userCurrency');
    if (savedCurrencyCode) { const savedCurrency = currencies.find(c => c.code === savedCurrencyCode); if (savedCurrency) setSelectedCurrency(savedCurrency); }
    const savedLanguageCode = localStorage.getItem('userLanguage');
    if (savedLanguageCode) { const savedLanguage = languages.find(l => l.code === savedLanguageCode); if (savedLanguage) setSelectedLanguage(savedLanguage); }
  }, []);
  useEffect(() => {
    const handleCurrencyUpdate = ((event: CustomEvent<Currency>) => setSelectedCurrency(event.detail)) as EventListener;
    const handleLanguageUpdate = ((event: CustomEvent<Language>) => setSelectedLanguage(event.detail)) as EventListener;
    eventBus.on('settings:currency', handleCurrencyUpdate);
    eventBus.on('settings:language', handleLanguageUpdate);
    return () => { eventBus.remove('settings:currency', handleCurrencyUpdate); eventBus.remove('settings:language', handleLanguageUpdate); };
  }, []);
  const handleSetCurrency = (currency: Currency) => { localStorage.setItem('userCurrency', currency.code); eventBus.dispatch('settings:currency', currency); };
  const handleSetLanguage = (language: Language) => { localStorage.setItem('userLanguage', language.code); eventBus.dispatch('settings:language', language); };
  return { selectedCurrency, setSelectedCurrency: handleSetCurrency, selectedLanguage, setSelectedLanguage: handleSetLanguage };
};


// --- 4. REUSABLE MODAL COMPONENT (MODIFIED TO USE A PORTAL) ---
interface Item { code: string; name: string; [key: string]: any; }
interface SettingsModalProps<T extends Item> { isOpen: boolean; onClose: () => void; title: string; items: T[]; selectedItem: T; onSelectItem: (item: T) => void; renderItem: (item: T) => React.ReactNode; }

const SettingsModal = <T extends Item>({ isOpen, onClose, title, items, selectedItem, onSelectItem, renderItem }: SettingsModalProps<T>) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true); // Set mounted on client side
    return () => setIsMounted(false);
  }, []);

  const filteredItems = items.filter(item => Object.values(item).some(value => String(value).toLowerCase().includes(searchTerm.toLowerCase())));
  useEffect(() => { if (!isOpen) { setTimeout(() => setSearchTerm(''), 300); } }, [isOpen]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4" onClick={onClose}>
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="relative bg-white shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-500 hover:bg-slate-100 rounded-full z-10" aria-label="Close"><X size={24} /></button>
            <div className="flex items-center p-6 border-b"><div className="relative flex-1"><Search className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" /><input type="text" placeholder={`Search ${title}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full text-xl pl-10 bg-transparent focus:outline-none" /></div></div>
            <div className="overflow-y-auto p-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">{title}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredItems.map(item => (<button key={item.code} onClick={() => { onSelectItem(item); onClose(); }} className={`p-4 rounded-lg text-left transition-colors duration-200 ${selectedItem.code === item.code ? 'bg-red-500 text-white shadow' : 'bg-slate-100 hover:bg-slate-200'}`}>{renderItem(item)}</button>))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // 2. Conditionally create the portal only on the client side
  if (isMounted) {
    return createPortal(modalContent, document.body);
  }
  return null;
};

// --- 5. MAIN SWITCHER COMPONENT (No changes needed here) ---
interface CurrencyLanguageSwitcherProps { variant: 'header' | 'footer'; headerLinkClasses?: string; isTransparent?: boolean; }
export default function CurrencyLanguageSwitcher({ variant, headerLinkClasses, isTransparent }: CurrencyLanguageSwitcherProps) {
  const [isCurrencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [isLanguageModalOpen, setLanguageModalOpen] = useState(false);
  const { selectedCurrency, setSelectedCurrency, selectedLanguage, setSelectedLanguage } = useSettings();
  const baseButtonClasses = "p-2 rounded-md transition-all duration-300";
  const transparentBgClasses = "bg-white/10 hover:bg-white/20 backdrop-blur-sm";

  return (
    <>
      <div className={variant === 'header' ? 'flex items-center gap-2 font-semibold text-sm' : 'flex items-center gap-4'}>
        <button onClick={() => setCurrencyModalOpen(true)} className={variant === 'header' ? `${headerLinkClasses} ${baseButtonClasses} hidden sm:inline-flex items-center gap-1.5 ${isTransparent ? transparentBgClasses : ''}` : "inline-flex h-8 items-center rounded-md border border-slate-300 px-3 hover:bg-slate-200 text-sm"}>
          <span className="font-bold">{selectedCurrency.symbol}</span><span>{selectedCurrency.code}</span>
        </button>
        <button onClick={() => setLanguageModalOpen(true)} className={variant === 'header' ? `${headerLinkClasses} ${baseButtonClasses} flex items-center gap-1.5 group ${isTransparent ? transparentBgClasses : ''}` : "inline-flex h-8 items-center rounded-md border border-slate-300 px-3 hover:bg-slate-200 text-sm"}>
          {variant === 'header' && <Globe size={20} className="group-hover:text-red-500" />}
          <span>{variant === 'header' ? selectedLanguage.code.toUpperCase() : `${selectedLanguage.name} (${selectedLanguage.code.toUpperCase()})`}</span>
        </button>
      </div>
      <SettingsModal isOpen={isCurrencyModalOpen} onClose={() => setCurrencyModalOpen(false)} title="Select a Currency" items={currencies} selectedItem={selectedCurrency} onSelectItem={(item) => setSelectedCurrency(item as Currency)} renderItem={(item) => (<><div className="font-bold">{item.code} <span className="font-normal">{item.symbol}</span></div><div className="text-sm opacity-80">{item.name}</div></>)} />
      <SettingsModal isOpen={isLanguageModalOpen} onClose={() => setLanguageModalOpen(false)} title="Select a Language" items={languages} selectedItem={selectedLanguage} onSelectItem={(item) => setSelectedLanguage(item as Language)} renderItem={(item) => (<><div className="font-bold">{item.name}</div><div className="text-sm opacity-80">{item.nativeName}</div></>)} />
    </>
  );
}