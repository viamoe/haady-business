'use client';

import Image from 'next/image';

interface FlagProps {
  countryName: string;
  size?: 's' | 'm' | 'l';
  className?: string;
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

export function Flag({ countryName, size = 'm', className = '' }: FlagProps) {
  const flagSize = sizeMap[size];
  // Flags are stored in assets/flags/{country-name}.png (lowercase, with spaces)
  const filename = countryNameToFilename[countryName] || countryName.toLowerCase();
  const flagUrl = `${SUPABASE_STORAGE_URL}/flags/${filename}.png`;

  return (
    <Image
      src={flagUrl}
      alt={countryName}
      width={flagSize}
      height={flagSize}
      className={`rounded ${className}`}
      style={{ objectFit: 'cover' }}
    />
  );
}

