import { useEffect, useState } from 'react';
import {
  createPrivacyExportDocument,
  formatPrivacyExportFileName,
} from '@/core/privacy/privacy-export';
import {
  clearAllLocalData,
  clearHistoryData,
  exportLocalData,
  getLocalDataSnapshot,
  resetCalibrationData,
  resetSettingsToDefaults,
  type LocalDataSnapshot,
} from '@/storage/repositories/privacy.repository';

export type RuntimeStatus = {
  isOnline: boolean;
  isStandalone: boolean;
  serviceWorkerSupported: boolean;
  storageEstimateBytes: number | null;
  storageQuotaBytes: number | null;
};

type PrivacyAction =
  | 'export'
  | 'clear-history'
  | 'reset-calibration'
  | 'reset-settings'
  | 'clear-all'
  | null;

const initialRuntimeStatus: RuntimeStatus = {
  isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  isStandalone: false,
  serviceWorkerSupported:
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  storageEstimateBytes: null,
  storageQuotaBytes: null,
};

export function usePrivacyControls() {
  const [snapshot, setSnapshot] = useState<LocalDataSnapshot | null>(null);
  const [runtimeStatus, setRuntimeStatus] =
    useState<RuntimeStatus>(initialRuntimeStatus);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<PrivacyAction>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
    void refreshRuntimeStatus();

    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const updateRuntimeStatus = () => {
      void refreshRuntimeStatus();
    };

    window.addEventListener('online', updateRuntimeStatus);
    window.addEventListener('offline', updateRuntimeStatus);

    if ('addEventListener' in mediaQuery) {
      mediaQuery.addEventListener('change', updateRuntimeStatus);
    }

    return () => {
      window.removeEventListener('online', updateRuntimeStatus);
      window.removeEventListener('offline', updateRuntimeStatus);

      if ('removeEventListener' in mediaQuery) {
        mediaQuery.removeEventListener('change', updateRuntimeStatus);
      }
    };
  }, []);

  async function refresh() {
    setIsLoading(true);

    try {
      const nextSnapshot = await getLocalDataSnapshot();
      setSnapshot(nextSnapshot);
      setError(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to read local data status.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshRuntimeStatus() {
    try {
      const nextRuntimeStatus: RuntimeStatus = {
        isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
        isStandalone:
          typeof window !== 'undefined' &&
          window.matchMedia('(display-mode: standalone)').matches,
        serviceWorkerSupported:
          typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
        storageEstimateBytes: null,
        storageQuotaBytes: null,
      };

      if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        nextRuntimeStatus.storageEstimateBytes = estimate.usage ?? null;
        nextRuntimeStatus.storageQuotaBytes = estimate.quota ?? null;
      }

      setRuntimeStatus(nextRuntimeStatus);
    } catch {
      setRuntimeStatus((currentStatus) => ({
        ...currentStatus,
        isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
        isStandalone:
          typeof window !== 'undefined' &&
          window.matchMedia('(display-mode: standalone)').matches,
        serviceWorkerSupported:
          typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
      }));
    }
  }

  async function runAction(
    action: Exclude<PrivacyAction, null>,
    task: () => Promise<void>,
    successMessage: string,
  ) {
    setActiveAction(action);
    setMessage(null);
    setError(null);

    try {
      await task();
      await refresh();
      await refreshRuntimeStatus();
      setMessage(successMessage);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'This privacy action could not be completed.',
      );
    } finally {
      setActiveAction(null);
    }
  }

  async function exportJson() {
    return runAction(
      'export',
      async () => {
        const exportedAt = Date.now();
        const rawExport = await exportLocalData();
        const document = createPrivacyExportDocument({
          exportedAt,
          ...rawExport,
        });
        downloadJsonFile(formatPrivacyExportFileName(exportedAt), document);
      },
      'Local data exported as JSON.',
    );
  }

  async function clearHistory() {
    return runAction(
      'clear-history',
      async () => {
        await clearHistoryData();
      },
      'Local history cleared. Settings, calibration, and reusable custom symptom labels were kept.',
    );
  }

  async function resetCalibration() {
    return runAction(
      'reset-calibration',
      async () => {
        await resetCalibrationData();
      },
      'Calibration reset. You can run onboarding again to create a new baseline.',
    );
  }

  async function resetSettings() {
    return runAction(
      'reset-settings',
      async () => {
        await resetSettingsToDefaults();
      },
      'Settings reset to their local defaults.',
    );
  }

  async function clearAll() {
    return runAction(
      'clear-all',
      async () => {
        await clearAllLocalData();
      },
      'All local data was cleared from this browser.',
    );
  }

  return {
    snapshot,
    runtimeStatus,
    isLoading,
    activeAction,
    message,
    error,
    refresh,
    exportJson,
    clearHistory,
    resetCalibration,
    resetSettings,
    clearAll,
  };
}

function downloadJsonFile(fileName: string, document: unknown) {
  if (typeof window === 'undefined') {
    return;
  }

  const blob = new Blob([JSON.stringify(document, null, 2)], {
    type: 'application/json',
  });
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement('a');

  try {
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    window.document.body.append(link);
    link.click();
  } finally {
    link.remove();
    window.URL.revokeObjectURL(url);
  }
}
