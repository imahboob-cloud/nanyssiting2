import { Phone } from 'lucide-react';
import { useState } from 'react';

interface PhoneRevealProps {
  number: string;
  size?: number;
}

export const PhoneReveal = ({ number, size = 16 }: PhoneRevealProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative inline-flex items-center gap-2 cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Phone size={size} className="transition-colors group-hover:text-salmon" />
      <div className="relative overflow-hidden h-6">
        <a 
          href={`tel:${number}`} 
          className={`absolute whitespace-nowrap transition-all duration-500 ease-out ${
            isHovered 
              ? 'translate-x-0 opacity-100' 
              : '-translate-x-full opacity-0'
          } hover:text-white`}
        >
          {number}
        </a>
        <span 
          className={`absolute whitespace-nowrap transition-all duration-500 ease-out ${
            isHovered 
              ? 'translate-x-full opacity-0' 
              : 'translate-x-0 opacity-100'
          }`}
        >
          Appeler
        </span>
      </div>
    </div>
  );
};
