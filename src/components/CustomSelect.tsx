import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

export interface CustomSelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  options: Array<string | CustomSelectOption>;
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  placeholder?: string;
}

export function CustomSelect({
  value,
  options,
  onChange,
  disabled = false,
  ariaLabel,
  className = "",
  buttonClassName = "",
  placeholder = "Choose..."
}: CustomSelectProps) {
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState({ left: 0, top: 0, width: 220, maxHeight: 320 });
  const portalTarget = document.querySelector(".theme-dream") || document.body;
  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );
  const selectedOption = normalizedOptions.find((option) => option.value === value);

  const updateMenuPosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gutter = 12;
    const menuGap = 6;
    const preferredMaxHeight = 340;
    const minimumUsefulHeight = 160;
    const width = Math.max(rect.width, 180);
    const left = Math.min(Math.max(gutter, rect.left), Math.max(gutter, window.innerWidth - width - gutter));
    const spaceBelow = window.innerHeight - rect.bottom - gutter;
    const spaceAbove = rect.top - gutter;
    const opensUp = spaceBelow < minimumUsefulHeight && spaceAbove > spaceBelow;
    const availableHeight = (opensUp ? spaceAbove : spaceBelow) - menuGap;
    const maxHeight = Math.max(120, Math.min(preferredMaxHeight, availableHeight));
    const top = opensUp
      ? Math.max(gutter, rect.top - maxHeight - menuGap)
      : Math.min(rect.bottom + menuGap, window.innerHeight - maxHeight - gutter);
    setMenuRect({
      left,
      top,
      width,
      maxHeight
    });
  };

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  const choose = (option: CustomSelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setOpen(true);
  };

  return (
    <div className={`custom-select ${className}`.trim()}>
      <button
        ref={buttonRef}
        type="button"
        className={`custom-select-trigger ${buttonClassName}`.trim()}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        onClick={() => {
          if (disabled) return;
          updateMenuPosition();
          setOpen((value) => !value);
        }}
        onKeyDown={handleKeyDown}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <Icon name="ChevronDown" className="h-4 w-4" />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          id={`${id}-menu`}
          className="custom-select-menu"
          role="listbox"
          style={{
            left: menuRect.left,
            top: menuRect.top,
            width: menuRect.width,
            maxHeight: menuRect.maxHeight,
            zIndex: 13000
          }}
        >
          {normalizedOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`custom-select-option ${option.value === value ? "active" : ""}`}
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              onClick={() => choose(option)}
            >
              {option.label}
            </button>
          ))}
        </div>,
        portalTarget
      )}
    </div>
  );
}
