import React, { Suspense, lazy, useEffect } from 'react';
import { AppShell } from '@/src/components/AppShell';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { ToastContainer } from '@/src/components/ToastContainer';
import { HomeExplore } from '@/src/features/HomeExplore';
import { useAppStore } from '@/src/store/useAppStore';

const CommandLibrary = lazy(() =>
  import('@/src/features/CommandLibrary').then((m) => ({ default: m.CommandLibrary }))
);
const HonestFeedbackStudio = lazy(() =>
  import('@/src/features/HonestFeedbackStudio').then((m) => ({ default: m.HonestFeedbackStudio }))
);
const PromptBuilder = lazy(() =>
  import('@/src/features/PromptBuilder').then((m) => ({ default: m.PromptBuilder }))
);
const PromptAnalyzer = lazy(() =>
  import('@/src/features/PromptAnalyzer').then((m) => ({ default: m.PromptAnalyzer }))
);
const AlwaysOnSetup = lazy(() =>
  import('@/src/features/AlwaysOnSetup').then((m) => ({ default: m.AlwaysOnSetup }))
);
const MyLibrary = lazy(() =>
  import('@/src/features/MyLibrary').then((m) => ({ default: m.MyLibrary }))
);
const CustomCommandCreator = lazy(() =>
  import('@/src/features/CustomCommandCreator').then((m) => ({ default: m.CustomCommandCreator }))
);
const SettingsScreen = lazy(() =>
  import('@/src/features/SettingsScreen').then((m) => ({ default: m.SettingsScreen }))
);
const HelpFaq = lazy(() =>
  import('@/src/features/HelpFaq').then((m) => ({ default: m.HelpFaq }))
);

const ScreenSkeleton: React.FC = () => (
  <div className="max-w-5xl mx-auto px-6 py-10 space-y-4 animate-pulse">
    <div className="h-8 bg-slate-200 dark:bg-white/10 rounded-xl w-56" />
    <div className="h-4 bg-slate-200 dark:bg-white/10 rounded-lg w-96 max-w-full" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
      <div className="h-44 rounded-2xl bg-slate-200/70 dark:bg-white/[0.05]" />
      <div className="h-44 rounded-2xl bg-slate-200/70 dark:bg-white/[0.05]" />
    </div>
  </div>
);

export default function App() {
  const activeScreen = useAppStore((s) => s.activeScreen);
  const theme = useAppStore((s) => s.settings.theme);
  const reduceMotion = useAppStore((s) => s.settings.reduceMotion);

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
      root.classList.toggle('dark', isDark);
    };

    applyTheme();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [theme]);

  // Sync reduce-motion class
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  const renderScreen = () => {
    switch (activeScreen) {
      case 'explore':
        return <HomeExplore />;
      case 'library-commands':
        return <CommandLibrary />;
      case 'feedback-studio':
        return <HonestFeedbackStudio />;
      case 'builder':
        return <PromptBuilder />;
      case 'analyzer':
        return <PromptAnalyzer />;
      case 'setup':
        return <AlwaysOnSetup />;
      case 'my-library':
        return <MyLibrary />;
      case 'custom-commands':
        return <CustomCommandCreator />;
      case 'settings':
        return <SettingsScreen />;
      case 'help':
        return <HelpFaq />;
      default:
        return <HomeExplore />;
    }
  };

  return (
    <ErrorBoundary>
      <AppShell>
        <Suspense fallback={<ScreenSkeleton />}>{renderScreen()}</Suspense>
      </AppShell>
      <ToastContainer />
    </ErrorBoundary>
  );
}
