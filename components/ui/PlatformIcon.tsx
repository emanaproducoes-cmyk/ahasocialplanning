'use client';

import { cn } from '@/lib/utils/cn';

interface PlatformIconProps {
  platform: string;
  size?: number;
  className?: string;
}

export function PlatformIcon({ platform, size = 20, className }: PlatformIconProps) {
  const icons: Record<string, JSX.Element> = {
    instagram: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <defs>
          <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
            <stop offset="0%" stopColor="#fdf497"/>
            <stop offset="5%" stopColor="#fdf497"/>
            <stop offset="45%" stopColor="#fd5949"/>
            <stop offset="60%" stopColor="#d6249f"/>
            <stop offset="90%" stopColor="#285AEB"/>
          </radialGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#ig-grad)"/>
        <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
        <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
      </svg>
    ),
    facebook: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <rect width="24" height="24" rx="6" fill="#1877F2"/>
        <path d="M15.5 8H13.5C13.2 8 13 8.2 13 8.5V10H15.5L15.2 12.5H13V19H10.5V12.5H9V10H10.5V8.5C10.5 6.6 11.8 5.5 13.5 5.5C14.3 5.5 15.1 5.6 15.5 5.7V8Z" fill="white"/>
      </svg>
    ),
    youtube: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <rect width="24" height="24" rx="6" fill="#FF0000"/>
        <path d="M19.5 8.5C19.3 7.7 18.7 7.1 17.9 6.9C16.5 6.5 12 6.5 12 6.5C12 6.5 7.5 6.5 6.1 6.9C5.3 7.1 4.7 7.7 4.5 8.5C4.1 9.9 4.1 12 4.1 12C4.1 12 4.1 14.1 4.5 15.5C4.7 16.3 5.3 16.9 6.1 17.1C7.5 17.5 12 17.5 12 17.5C12 17.5 16.5 17.5 17.9 17.1C18.7 16.9 19.3 16.3 19.5 15.5C19.9 14.1 19.9 12 19.9 12C19.9 12 19.9 9.9 19.5 8.5Z" fill="white"/>
        <polygon points="10,9.5 10,14.5 14.5,12" fill="#FF0000"/>
      </svg>
    ),
    tiktok: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <rect width="24" height="24" rx="6" fill="#010101"/>
        <path d="M17 8.5C16.2 8.5 15.5 8.2 15 7.8C14.5 7.3 14.2 6.7 14.1 6H12V15.5C12 16.3 11.3 17 10.5 17C9.7 17 9 16.3 9 15.5C9 14.7 9.7 14 10.5 14C10.7 14 10.9 14.1 11 14.1V11.9C10.8 11.9 10.7 11.9 10.5 11.9C8.6 11.9 7 13.5 7 15.4C7 17.3 8.6 18.9 10.5 18.9C12.4 18.9 14 17.3 14 15.4V10.8C14.8 11.4 15.9 11.7 17 11.7V9.5C17 9.5 17 8.5 17 8.5Z" fill="white"/>
      </svg>
    ),
    linkedin: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <rect width="24" height="24" rx="6" fill="#0A66C2"/>
        <path d="M7.5 10H9.5V17H7.5V10ZM8.5 9C7.9 9 7.5 8.6 7.5 8C7.5 7.4 7.9 7 8.5 7C9.1 7 9.5 7.4 9.5 8C9.5 8.6 9.1 9 8.5 9ZM17 17H15V13.5C15 12.7 14.3 12 13.5 12C12.7 12 12 12.7 12 13.5V17H10V10H12V11C12.4 10.4 13.2 10 14 10C15.7 10 17 11.3 17 13V17Z" fill="white"/>
      </svg>
    ),
    threads: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <rect width="24" height="24" rx="6" fill="#1C1C1C"/>
        <path d="M12 6C9.2 6 7 8.2 7 11C7 13 8.1 14.8 9.7 15.7C9.5 16.1 9.4 16.6 9.5 17.1C9.6 17.7 10 18.1 10.6 18C11.2 17.9 11.7 17.4 11.9 16.8C12.3 16.9 12.7 17 13 17C15.8 17 18 14.8 18 12C18 8.7 15.3 6 12 6ZM12 15C10.3 15 9 13.7 9 12C9 10.3 10.3 9 12 9C13.7 9 15 10.3 15 12C15 13.7 13.7 15 12 15Z" fill="white"/>
      </svg>
    ),
    pinterest: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <rect width="24" height="24" rx="6" fill="#E60023"/>
        <path d="M12 5C8.1 5 5 8.1 5 12C5 15 6.9 17.5 9.6 18.5C9.5 18 9.5 17.2 9.7 16.5L10.8 11.8C10.8 11.8 10.5 11.2 10.5 10.3C10.5 8.9 11.3 7.9 12.3 7.9C13.1 7.9 13.5 8.5 13.5 9.2C13.5 10 13 11.2 12.7 12.3C12.5 13.2 13.1 14 14 14C15.6 14 16.5 12.1 16.5 9.8C16.5 7.8 15.1 6.4 12.9 6.4C10.4 6.4 8.9 8.3 8.9 10.3C8.9 11.1 9.2 11.9 9.6 12.4C9.7 12.5 9.7 12.6 9.7 12.7L9.4 13.8C9.4 14 9.2 14.1 9 14C7.8 13.4 7 11.8 7 10.2C7 7.5 9.1 5 13.2 5C16.5 5 18.9 7.2 18.9 10C18.9 13 17 15.4 14.4 15.4C13.4 15.4 12.5 14.9 12.2 14.3L11.5 16.9C11.2 17.9 10.6 19 10.1 19.7C10.7 19.9 11.3 20 12 20C15.9 20 19 16.9 19 13C19 9.1 15.9 5 12 5Z" fill="white"/>
      </svg>
    ),
    google_business: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <rect width="24" height="24" rx="6" fill="white" stroke="#ddd" strokeWidth="0.5"/>
        <path d="M21.8 12.2C21.8 11.5 21.7 10.8 21.6 10.2H12V14H17.5C17.3 15.2 16.5 16.3 15.4 17V19.4H18.7C20.6 17.6 21.8 15.1 21.8 12.2Z" fill="#4285F4"/>
        <path d="M12 21.9C14.7 21.9 17 21 18.7 19.4L15.4 17C14.5 17.6 13.4 18 12 18C9.4 18 7.2 16.2 6.4 13.8H3V16.3C4.7 19.6 8.1 21.9 12 21.9Z" fill="#34A853"/>
        <path d="M6.4 13.8C6.2 13.2 6.1 12.6 6.1 12C6.1 11.4 6.2 10.8 6.4 10.2V7.7H3C2.4 9 2 10.4 2 12C2 13.6 2.4 15 3 16.3L6.4 13.8Z" fill="#FBBC05"/>
        <path d="M12 6C13.5 6 14.9 6.5 16 7.5L18.8 4.7C17 3 14.7 2 12 2C8.1 2 4.7 4.4 3 7.7L6.4 10.2C7.2 7.8 9.4 6 12 6Z" fill="#EA4335"/>
      </svg>
    ),
  };

  return icons[platform] ?? (
    <div
      className={cn('rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600', className)}
      style={{ width: size, height: size }}
    >
      {platform?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}
