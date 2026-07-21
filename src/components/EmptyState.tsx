import React from 'react';
import { LucideIcon, Shield, Inbox, Calendar, ShoppingBag, BellOff, MessageSquare } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: 'teams' | 'messages' | 'tournaments' | 'shop' | 'notifications' | 'default';
  actionButton?: React.ReactNode;
}

const iconMap = {
  teams: Shield,
  messages: MessageSquare,
  tournaments: Calendar,
  shop: ShoppingBag,
  notifications: BellOff,
  default: Inbox,
};

export default function EmptyState({
  title,
  description,
  icon = 'default',
  actionButton,
}: EmptyStateProps) {
  const IconComponent = iconMap[icon] || iconMap.default;

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 py-16 border border-dashed border-white/10 rounded-[32px] bg-white/[0.01] max-w-md mx-auto my-6 animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/5 mb-4 shadow-[0_0_30px_rgba(255,255,255,0.02)]">
        <IconComponent size={24} className="text-white/40" />
      </div>
      <h3 className="text-sm font-display font-black text-white uppercase tracking-wider mb-1.5 px-4">
        {title}
      </h3>
      {description && (
        <p className="text-[11px] text-white/40 leading-relaxed max-w-[280px] mb-6 font-medium">
          {description}
        </p>
      )}
      {actionButton && <div className="mt-2">{actionButton}</div>}
    </div>
  );
}
