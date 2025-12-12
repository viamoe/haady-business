'use client';

import Image from 'next/image';

interface FlagProps {
  countryName?: string;
  flagUrl?: string;
  size?: 's' | 'm' | 'l';
  className?: string;
  rounded?: boolean;
}

const SUPABASE_STORAGE_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets';

const sizeMap = {
  s: 16,
  m: 24,
  l: 32,
};

// Map country names to bucket filenames
const countryNameToFilename: Record<string, string> = {
  'Saudi Arabia': 'saudi arabia',
  'United Arab Emirates': 'united arab emirates',
  'Kuwait': 'kuwait',
  'Qatar': 'qatar',
  'Bahrain': 'bahrain',
  'Oman': 'oman',
  'Egypt': 'egypt',
};

export function Flag({ countryName, flagUrl, size = 'm', className = '', rounded = false }: FlagProps) {
  const flagSize = sizeMap[size];
  
  // Use flag_url from database if provided, otherwise fallback to constructing URL from country name
  let finalFlagUrl: string;
  if (flagUrl) {
    finalFlagUrl = flagUrl;
  } else if (countryName) {
    // Fallback: construct URL from country name (for backward compatibility)
    const filename = countryNameToFilename[countryName] || countryName.toLowerCase();
    finalFlagUrl = `${SUPABASE_STORAGE_URL}/flags/${filename}.png`;
  } else {
    // Default fallback if neither is provided
    finalFlagUrl = `${SUPABASE_STORAGE_URL}/flags/default.png`;
  }

  return (
    <Image
      src={finalFlagUrl}
      alt={countryName || 'Country flag'}
      width={flagSize}
      height={flagSize}
      className={`${rounded ? 'rounded' : ''} ${className}`}
      style={{ objectFit: 'cover' }}
    />
  );
}

