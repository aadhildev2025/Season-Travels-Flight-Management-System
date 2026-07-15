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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: 'block', ...style }}
    >
      {/* Sleek delta wing / paper plane folds */}
      <path d="M2 22L22 2L13 13Z" fill="currentColor" fillOpacity="0.2" />
      <path d="M22 2L13 13L15 21Z" fill="currentColor" fillOpacity="0.1" />
      <path d="M22 2L2 22M22 2L15 21L13 13" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
