import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

export type Option = {
  label: string;
  value: string;
};

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CustomSelect({
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(() => {
    const selectedIndex = options.findIndex((option) => option.value === value);
    return selectedIndex >= 0 ? selectedIndex : 0;
  });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listboxId = useId();

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  useEffect(() => {
    const selectedIndex = options.findIndex((option) => option.value === value);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [options, value]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const commitSelection = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled || !options.length) {
      return;
    }

    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setIsOpen(true);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen((current) => !current);
      return;
    }

    if (!isOpen) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((current) => (current + 1) % options.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => (current - 1 + options.length) % options.length);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[highlightedIndex];
      if (option) {
        commitSelection(option.value);
      }
    }
  };

  return (
    <div ref={rootRef} className="relative min-w-[180px]">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        className={[
          'flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 text-left text-sm text-white/90 transition-all duration-200 ease-out focus:outline-none focus:ring-1 focus:ring-blue-400/40',
          disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-white/10',
        ].join(' ')}
        onClick={() => {
          if (disabled) {
            return;
          }
          setIsOpen((current) => !current);
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={selectedOption ? 'truncate text-white/90' : 'truncate text-slate-400'}>
          {selectedOption?.label ?? placeholder}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={[
            'h-4 w-4 shrink-0 text-white/60 transition-transform duration-200 ease-out',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 7.5 10 12.5 15 7.5" />
        </svg>
      </button>

      <div
        className={[
          'absolute left-0 right-0 top-full z-50 mt-2 origin-top rounded-xl border border-white/10 bg-[#0B1220]/95 shadow-2xl shadow-black/40 backdrop-blur-xl transition-all duration-150 ease-out',
          isOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0',
        ].join(' ')}
      >
        <ul
          id={listboxId}
          role="listbox"
          aria-activedescendant={`${listboxId}-option-${highlightedIndex}`}
          className="max-h-72 overflow-y-auto py-1.5"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;

            return (
              <li
                key={option.value || `option-${index}`}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={isSelected}
              >
                <button
                  type="button"
                  className={[
                    'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm transition-all duration-150 ease-out focus:outline-none',
                    isSelected
                      ? 'bg-blue-500/20 text-blue-300'
                      : isHighlighted
                        ? 'bg-white/10 text-white/90'
                        : 'text-white/80 hover:bg-white/10 hover:text-white/90',
                  ].join(' ')}
                  onClick={() => {
                    commitSelection(option.value);
                  }}
                  onMouseEnter={() => {
                    setHighlightedIndex(index);
                  }}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-300" aria-hidden="true" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
