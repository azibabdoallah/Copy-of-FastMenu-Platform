import React from 'react';
import { Dish } from '../types';

interface DishCardProps {
  dish: Dish;
  currency: string;
  onClick?: () => void;
}

const DishCard: React.FC<DishCardProps> = ({ dish, currency, onClick }) => {
  return (
    <div 
      className="bg-white py-4 border-b border-gray-50 flex gap-4 cursor-pointer hover:bg-gray-50 transition-colors group"
      onClick={onClick}
    >
      {/* Content Section (Right Side in RTL) */}
      <div className="flex-1 flex flex-col justify-between items-start text-right min-w-0">
        <div className="w-full">
          <h3 className="font-bold text-slate-900 text-base mb-1 group-hover:text-primary transition-colors">{dish.name}</h3>
          <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed mb-3 pl-2">{dish.description}</p>
        </div>
        
        <div className="flex items-center w-full mt-auto">
          <span className="text-[#ca8a04] font-bold text-base">{dish.price} {currency}</span>
        </div>
      </div>

      {/* Image Section (Left Side in RTL) */}
      <div className="w-28 h-24 shrink-0 relative overflow-hidden rounded-xl bg-gray-100">
        <img 
          src={dish.image} 
          alt={dish.name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {!dish.isAvailable && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center backdrop-blur-[1px]">
            <span className="text-red-600 text-[10px] font-bold border border-red-600 px-1.5 py-0.5 rounded bg-white">نفذت الكمية</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DishCard;