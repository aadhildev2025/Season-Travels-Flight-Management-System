import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function BrandLogo({ size = 24, className, style }: BrandLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Season Travels Logo"
      width={size}
      height={size}
      className={className}
      style={{
        display: 'block',
        objectFit: 'contain',
        ...style
      }}
    />
  );
}
