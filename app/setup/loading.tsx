import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg';

export default function SetupLoading() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header skeleton */}
      <div className="border-b p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Image
            src={HAADY_LOGO_URL}
            alt="Haady"
            width={32}
            height={32}
            className="w-8 h-8"
            priority
          />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      
      {/* Form skeleton */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          {/* Title */}
          <div className="text-center space-y-2">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
          
          {/* Form fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          
          {/* Button */}
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

