import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function BrandLogo({ size = 24, className, style }: BrandLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{
        display: 'block',
        objectFit: 'contain',
        ...style
      }}
    >
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2c-.5.1-.9.5-.9 1.1l.8 1.1 4.1 4.1L4.2 21l1.8.8 5.5-2.4 4.1 4.1 1.1.8c.6 0 1-.4 1.1-.9l1.2-8.2" />
    </svg>
  );
}
