"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";

// Define the generic item interface
export interface SelectionItem {
  id: string;
  name: string;
  description?: string;
  icon?: React.ReactNode | string;
  imageUrl?: string;
  value?: any;
}

interface SelectorProps {
  items: SelectionItem[];
  value: string | string[];
  onChange: (value: any) => void;
  className?: string;
  title?: string;
  placeholder?: string;
  disabled?: boolean;
  multiSelect?: boolean;
}

export function Selector({
  items,
  value,
  onChange,
  className = "",
  title = "SELECT OPTION",
  placeholder,
  disabled = false,
  multiSelect = false,
}: SelectorProps) {
  const [isClient, setIsClient] = useState(false);
  const [open, setOpen] = useState(false);

  const currentItem = !multiSelect
    ? items.find((item) => item.id === value || item.value === value)
    : undefined;

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div
        className={`border-border-default bg-surface-primary h-10 min-w-40 animate-pulse border ${className}`}
      >
        <div className="flex h-full items-center justify-center">
          <span className="font-mono text-xs">LOADING...</span>
        </div>
      </div>
    );
  }

  const handleSelectItem = (item: SelectionItem) => {
    if (multiSelect) {
      const currentArr: string[] = Array.isArray(value) ? value : [];
      const idVal = item.value !== undefined ? item.value : item.id;
      const exists = currentArr.includes(idVal);
      const nextArr = exists
        ? currentArr.filter((v) => v !== idVal)
        : [...currentArr, idVal];
      onChange(nextArr);
    } else {
      onChange(item.value !== undefined ? item.value : item.id);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={`bg-surface-primary border-border-default flex w-full items-center justify-between border px-3 py-2 text-left font-mono transition-colors hover:bg-white/5 ${className} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <div className="flex items-center space-x-2 truncate">
            {currentItem?.imageUrl && (
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden">
                <Image
                  width={24}
                  height={24}
                  src={currentItem.imageUrl}
                  alt={currentItem.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            {currentItem?.icon && (
              <div className="flex-shrink-0">{currentItem.icon}</div>
            )}
            <span className="truncate text-xs">
              {multiSelect
                ? Array.isArray(value) && value.length === 1
                  ? items.find((it) =>
                      value.includes(it.value !== undefined ? it.value : it.id),
                    )?.name || "1 selected"
                  : Array.isArray(value) && value.length > 1
                    ? `${value.length} selected`
                    : placeholder || title
                : currentItem?.name || placeholder || title}
            </span>
          </div>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="ml-2 h-4 w-4 flex-shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="bg-surface-primary border-border-default w-full min-w-[100px] rounded-none border p-0 text-white"
        align="start"
      >
        {/* {title && (
          <div className="border-b border-border-default p-2">
            <div className="font-mono text-xs">{title}</div>
          </div>
        )} */}

        <div className="max-h-[300px] overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.id}
              className={`flex w-full items-center p-2 text-left transition-colors hover:bg-white/5 ${
                (
                  multiSelect
                    ? Array.isArray(value) &&
                      value.includes(
                        item.value !== undefined ? item.value : item.id,
                      )
                    : item.id === value || item.value === value
                )
                  ? "bg-white/10"
                  : ""
              } `}
              onClick={() => handleSelectItem(item)}
            >
              {item.imageUrl && (
                <div className="mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden">
                  <Image
                    width={24}
                    height={24}
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              {item.icon && (
                <div className="mr-2 flex-shrink-0">{item.icon}</div>
              )}

              <div className="flex flex-col items-start">
                <span className="text-xs">{item.name}</span>
                {item.description && (
                  <span className="text-[10px] opacity-70">
                    {item.description}
                  </span>
                )}
              </div>

              {multiSelect &&
                Array.isArray(value) &&
                value.includes(
                  item.value !== undefined ? item.value : item.id,
                ) && <Check size={12} className="ml-auto text-white" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
