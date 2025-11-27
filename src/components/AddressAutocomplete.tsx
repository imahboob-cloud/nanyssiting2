import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPostalCodeChange: (value: string) => void;
  onCityChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  variant?: 'default' | 'branded';
}

function extractBelgianPostalAndCity(raw: string): { postalCode?: string; city?: string } {
  const value = raw.trim();

  // Cherche un CP belge (4 chiffres) suivi d'une ville, éventuellement suivi d'autres infos (pays, etc.)
  const cpVilleRegex = /(?:(?:^|[,\n]))\s*(\d{4})\s+([A-Za-zÀ-ÿ'’\-\s]{2,})(?=,|$)/;
  const match = value.match(cpVilleRegex);

  if (match) {
    const postalCode = match[1];
    const city = match[2].trim();
    return { postalCode, city };
  }

  return {};
}

export function AddressAutocomplete({
  value,
  onChange,
  onPostalCodeChange,
  onCityChange,
  placeholder = "Commencez à taper votre adresse (rue, numéro, CP ville)...",
  className,
  disabled = false,
  variant = 'default',
}: AddressAutocompleteProps) {
  const handleInputChange = (newValue: string) => {
    onChange(newValue);

    // Extraction locale sans API : si l'utilisateur tape "Rue X 123, 1050 Ixelles, Belgique"
    const cleaned = newValue.replace(',', ' ');
    const { postalCode, city } = extractBelgianPostalAndCity(cleaned);

    if (postalCode) {
      onPostalCodeChange(postalCode);
    }
    if (city) {
      onCityChange(city);
    }
  };

  const inputClasses =
    variant === 'branded'
      ? 'w-full bg-muted border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-salmon focus:ring-1 focus:ring-salmon transition-colors'
      : '';

  const detection = extractBelgianPostalAndCity(value.replace(',', ' '));

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(inputClasses, className)}
        />
      </div>
      {detection.postalCode && detection.city && (
        <p className="text-xs text-muted-foreground">
          CP / Ville détectés :{' '}
          <span className="font-medium text-foreground">
            {detection.postalCode} {detection.city}
          </span>
        </p>
      )}
    </div>
  );
}
