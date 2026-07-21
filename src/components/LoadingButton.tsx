import React from 'react';
import { Loader2 } from 'lucide-react';
import { soundService } from '../services/soundService';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  children: React.ReactNode;
  loadingText?: string;
  soundType?: 'click' | 'success' | 'warning' | 'error' | 'ambient';
  className?: string;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export default function LoadingButton({
  isLoading = false,
  children,
  loadingText,
  className = '',
  disabled,
  onClick,
  soundType = 'click',
  ...props
}: LoadingButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading || disabled) {
      e.preventDefault();
      return;
    }
    
    // Play sound based on specified soundType
    if (soundType === 'click') soundService.playClick();
    else if (soundType === 'success') soundService.playSuccess();
    else if (soundType === 'warning') soundService.playWarning();
    else if (soundType === 'error') soundService.playError();
    else if (soundType === 'ambient') soundService.playAmbient();

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      disabled={isLoading || disabled}
      onClick={handleClick}
      className={`relative flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 size={16} className="animate-spin text-current shrink-0" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
