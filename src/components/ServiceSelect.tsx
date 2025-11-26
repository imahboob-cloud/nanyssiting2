import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { services } from '@/data/services';
import { cn } from '@/lib/utils';

interface ServiceSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export const ServiceSelect = ({ value, onChange }: ServiceSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = [
    ...services.map(s => ({ value: s.title, label: s.title })),
    { value: 'Autre', label: 'Autre demande' }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide ml-3 mb-1 block">
        Votre besoin principal
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-card border border-border text-foreground font-medium rounded-2xl px-5 py-3 flex items-center justify-between hover:border-salmon transition-colors focus:outline-none focus:border-salmon focus:ring-1 focus:ring-salmon"
      >
        <span>{selectedOption?.label || 'Sélectionnez un service'}</span>
        <ChevronDown 
          className={cn(
            "text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
          size={20} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-80 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-5 py-3 text-left flex items-center justify-between transition-colors hover:bg-salmon/10",
                  value === option.value && "bg-salmon/10 text-salmon font-bold"
                )}
              >
                <span>{option.label}</span>
                {value === option.value && (
                  <Check className="text-salmon" size={18} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
