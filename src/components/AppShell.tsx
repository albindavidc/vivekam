import React, { useState } from 'react';
import {
  Compass,
  TerminalSquare,
  BookOpen,
  ShieldAlert,
  Hammer,
  Gauge,
  DownloadCloud,
  Bookmark,
  PlusCircle,
  Settings,
  HelpCircle,
  Sun,
  Moon,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '@/src/store/useAppStore';
import type { ActiveScreen } from '@/src/types';

interface NavItem {
  id: ActiveScreen;
  label: string;
  labelMl: string;
  icon: React.ComponentType<{ className?: string }>;
  section: 'core' | 'studios' | 'manage';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'explore', label: 'Explore', labelMl: 'തുടക്കം', icon: Compass, section: 'core' },
  { id: 'workbench', label: 'Workbench', labelMl: 'വർക്ക്ബെഞ്ച്', icon: TerminalSquare, section: 'core' },
  { id: 'library-commands', label: 'Commands', labelMl: 'കമാൻഡുകൾ', icon: BookOpen, section: 'core' },
  { id: 'feedback-studio', label: 'Feedback Studio', labelMl: 'ഫീഡ്ബാക്ക്', icon: ShieldAlert, section: 'studios' },
  { id: 'builder', label: 'Prompt Builder', labelMl: 'ബിൽഡർ', icon: Hammer, section: 'studios' },
  { id: 'analyzer', label: 'Prompt Analyzer', labelMl: 'അനലൈസർ', icon: Gauge, section: 'studios' },
  { id: 'setup', label: 'Always-On Setup', labelMl: 'സെറ്റപ്പ്', icon: DownloadCloud, section: 'studios' },
  { id: 'my-library', label: 'My Library', labelMl: 'ലൈബ്രറി', icon: Bookmark, section: 'manage' },
  { id: 'custom-commands', label: 'Custom Commands', labelMl: 'കസ്റ്റം', icon: PlusCircle, section: 'manage' },
  { id: 'settings', label: 'Settings', labelMl: 'സെറ്റിംഗ്സ്', icon: Settings, section: 'manage' },
  { id: 'help', label: 'Help & FAQ', labelMl: 'സഹായം', icon: HelpCircle, section: 'manage' },
];

const MOBILE_PRIMARY_TABS: ActiveScreen[] = ['explore', 'workbench', 'library-commands', 'feedback-studio'];

export const SrishtiLogoMark: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <rect width="32" height="32" rx="9" className="fill-amber-500/15 dark:fill-amber-500/20" />
    <path
      d="M19.5 7.5L12.5 24.5"
      stroke="url(#srishtiGrad)"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <path
      d="M9 12.5L6.5 16L9 19.5"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-slate-700 dark:text-slate-200"
    />
    <path
      d="M23 12.5L25.5 16L23 19.5"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-slate-700 dark:text-slate-200"
    />
    <defs>
      <linearGradient id="srishtiGrad" x1="12.5" y1="7.5" x2="19.5" y2="24.5" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B" />
        <stop offset="1" stopColor="#F97316" />
      </linearGradient>
    </defs>
  </svg>
);

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const activeScreen = useAppStore((s) => s.activeScreen);
  const setActiveScreen = useAppStore((s) => s.setActiveScreen);
  const language = useAppStore((s) => s.settings.language);
  const theme = useAppStore((s) => s.settings.theme);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeItem = NAV_ITEMS.find((n) => n.id === activeScreen) ?? NAV_ITEMS[0];

  const handleNavSelect = (id: ActiveScreen) => {
    setActiveScreen(id);
    setMobileMenuOpen(false);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: nextTheme });
  };

  const toggleLanguage = () => {
    updateSettings({ language: language === 'en' ? 'ml' : 'en' });
  };

  const renderSection = (sectionKey: NavItem['section'], title: string) => {
    const items = NAV_ITEMS.filter((i) => i.section === sectionKey);
    return (
      <div className="space-y-1">
        <div className="px-3 pb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          {title}
        </div>
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavSelect(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                active
                  ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-950 dark:hover:text-white border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate whitespace-nowrap">
                {language === 'ml' ? item.labelMl : item.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-dvh flex flex-col md:flex-row bg-[#F7F8FA] dark:bg-[#0B0D12] text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col border-r border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0F1219] sticky top-0 h-dvh">
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => handleNavSelect('explore')}
            className="flex items-center gap-2.5 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg"
          >
            <SrishtiLogoMark className="w-7 h-7 shrink-0" />
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
              Srishti
            </span>
          </button>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {renderSection('core', language === 'ml' ? 'പ്രധാനം' : 'Workspace')}
          {renderSection('studios', language === 'ml' ? 'സ്റ്റുഡിയോകൾ' : 'Prompt Studios')}
          {renderSection('manage', language === 'ml' ? 'സിസ്റ്റം' : 'Library & System')}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            className="px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition whitespace-nowrap shrink-0 cursor-pointer"
            title="Switch UI language (English / മലയാളം)"
          >
            {language === 'en' ? 'EN / മലയാളം' : 'മലയാളം / EN'}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="p-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (3 clean zones on desktop / compact on mobile) */}
        <header className="sticky top-0 z-30 h-14 md:h-16 px-4 md:px-8 border-b border-slate-200 dark:border-white/[0.08] bg-white/85 dark:bg-[#0B0D12]/85 backdrop-blur-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => handleNavSelect('explore')}
              className="md:hidden flex items-center gap-2 shrink-0"
              aria-label="Srishti Home"
            >
              <SrishtiLogoMark className="w-6 h-6" />
              <span className="font-display font-bold text-base text-slate-900 dark:text-white whitespace-nowrap">
                Srishti
              </span>
            </button>
            <span className="md:hidden text-slate-300 dark:text-slate-700" aria-hidden="true">/</span>
            <h1 className="font-display text-sm md:text-base font-semibold text-slate-800 dark:text-slate-100 truncate">
              {language === 'ml' ? activeItem.labelMl : activeItem.label}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {activeScreen !== 'workbench' && (
              <button
                type="button"
                onClick={() => handleNavSelect('workbench')}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-105 transition whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                {language === 'ml' ? 'വർക്ക്ബെഞ്ച് തുറക്കുക' : 'Open Workbench'}
              </button>
            )}
          </div>
        </header>

        {/* Viewport Body */}
        <main className="flex-1 pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 border-t border-slate-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#0F1219]/95 backdrop-blur-md grid grid-cols-5 items-center px-1"
      >
        {MOBILE_PRIMARY_TABS.map((tabId) => {
          const item = NAV_ITEMS.find((n) => n.id === tabId)!;
          const Icon = item.icon;
          const active = activeScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavSelect(item.id)}
              className={`flex flex-col items-center justify-center gap-1 min-h-[44px] rounded-xl text-[11px] font-medium transition ${
                active
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="truncate max-w-[64px]">
                {item.id === 'feedback-studio' ? 'Feedback' : item.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-expanded={mobileMenuOpen}
          className={`flex flex-col items-center justify-center gap-1 min-h-[44px] rounded-xl text-[11px] font-medium transition ${
            mobileMenuOpen || !MOBILE_PRIMARY_TABS.includes(activeScreen)
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span>More</span>
        </button>
      </nav>

      {/* Mobile More Drawer */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-full max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-white dark:bg-[#121620] border-t border-slate-200 dark:border-white/10 p-4 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <span className="font-display font-semibold text-base">All Tools & Settings</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {NAV_ITEMS.filter((i) => !MOBILE_PRIMARY_TABS.includes(i.id)).map((item) => {
                const Icon = item.icon;
                const active = activeScreen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavSelect(item.id)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium min-h-[44px] ${
                      active
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      {language === 'ml' ? item.labelMl : item.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                );
              })}
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
              <span className="text-xs text-slate-500">Language</span>
              <button
                type="button"
                onClick={toggleLanguage}
                className="px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-white/10"
              >
                {language === 'en' ? 'Switch to മലയാളം' : 'Switch to English'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
