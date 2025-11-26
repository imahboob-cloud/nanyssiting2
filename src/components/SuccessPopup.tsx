import React from 'react';
import { X } from 'lucide-react';

// Vos couleurs de marque (à adapter si besoin)
const BRAND_COLORS = {
  salmon: '#F79B75',
  sage: '#81B7A9',
  lavender: '#D2C7FF',
};

interface SuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const SuccessPopup: React.FC<SuccessPopupProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Container Principal: centré sur Desktop, en bas sur Mobile */}
      <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center pointer-events-none">
        
        {/* Fond flouté (Backdrop) */}
        <div 
          className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity animate-fade-in pointer-events-auto"
          onClick={onClose}
        ></div>

        {/* Carte du Popup */}
        <div className="relative bg-white w-full md:w-[480px] md:rounded-[40px] rounded-t-[32px] p-8 md:p-10 shadow-2xl transform transition-all animate-slide-up md:animate-scale-in pointer-events-auto overflow-hidden">
          
          {/* Bouton Fermer (Croix) */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors z-20 cursor-pointer"
          >
            <X size={24} />
          </button>

          {/* Illustration "Fait main" Nanny & Bébé (SVG intégré) */}
          <div className="mb-8 flex justify-center relative">
            <div className="w-48 h-48 relative">
               {/* Forme abstraite en fond (Blob animé) */}
               <svg viewBox="0 0 200 200" className="w-full h-full absolute top-0 left-0 animate-pulse-slow">
                 <path fill="#FFF9F5" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-5.2C93.5,8.9,82.2,22.1,70.6,32.6C59,43.1,47.1,50.9,35.2,56.5C23.3,62.1,11.4,65.5,-1.3,67.7C-14,70,-28,71,-40.4,65.8C-52.8,60.6,-63.6,49.2,-71.3,36.4C-79,23.6,-83.5,9.4,-81.9,-4.2C-80.3,-17.8,-72.6,-30.8,-62.4,-41.2C-52.2,-51.6,-39.5,-59.4,-26.6,-67.4C-13.7,-75.4,-0.6,-83.6,12.9,-83.8C26.4,-84,30.5,-76.3,44.7,-76.4Z" transform="translate(100 100)" />
               </svg>
               
               {/* Dessin SVG Nanny + Bébé */}
               <svg viewBox="0 0 100 100" className="w-full h-full relative z-10">
                 {/* Tête Nanny */}
                 <circle cx="50" cy="35" r="12" fill={BRAND_COLORS.salmon} />
                 {/* Corps Nanny */}
                 <path d="M30,85 Q30,50 50,50 Q70,50 70,85" fill={BRAND_COLORS.sage} />
                 {/* Tête Bébé */}
                 <circle cx="62" cy="55" r="8" fill="#FDE2D0" />
                 {/* Corps Bébé (Emmailloté) */}
                 <path d="M54,85 Q54,65 62,65 Q70,65 70,85" fill={BRAND_COLORS.lavender} />
                 {/* Bulle Cœur animée */}
                 <g transform="translate(70, 25)">
                   <path d="M10,5 Q15,0 20,5 Q25,0 30,5 Q35,10 20,25 Q5,10 10,5" fill="#FF8BA7" className="animate-bounce" />
                 </g>
               </svg>
            </div>
          </div>

          {/* Contenu Texte */}
          <div className="text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              Merci pour votre confiance !
            </h3>
            <p className="text-gray-600 leading-relaxed text-lg mb-8">
              Notre coordinatrice prendra contact avec vous <span className="font-bold text-[#F79B75]">dans la journée</span> pour discuter de vos besoins.
            </p>
            
            {/* Bouton d'action */}
            <button 
              onClick={onClose} 
              className="w-full py-4 rounded-full font-bold text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all transform"
              style={{ backgroundColor: BRAND_COLORS.salmon }}
            >
               Retour au site
            </button>
          </div>
        </div>
      </div>

      {/* Styles CSS pour les animations (à inclure dans votre CSS global ou ici) */}
      <style>{`
        @keyframes slide-up {
          0% { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes scale-in {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
      `}</style>
    </>
  );
};

export default SuccessPopup;
