import React from 'react';

export const isImageLogo = (logo?: string): boolean => {
  if (!logo) return false;
  return (
    logo.startsWith('data:image') ||
    logo.startsWith('http://') ||
    logo.startsWith('https://') ||
    logo.startsWith('blob:') ||
    logo.startsWith('/')
  );
};

interface TeamLogoProps {
  logo?: string;
  name?: string;
  className?: string;
  imgClassName?: string;
  fallbackEmoji?: string;
}

export const TeamLogo: React.FC<TeamLogoProps> = ({
  logo,
  name,
  className = 'w-10 h-10',
  imgClassName = 'w-full h-full object-contain',
  fallbackEmoji = '🏏',
}) => {
  if (isImageLogo(logo)) {
    return (
      <div className={`flex items-center justify-center overflow-hidden shrink-0 ${className}`}>
        <img
          src={logo}
          alt={name ? `${name} logo` : 'Team logo'}
          className={imgClassName}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center shrink-0 select-none ${className}`}>
      <span>{logo || fallbackEmoji}</span>
    </div>
  );
};
