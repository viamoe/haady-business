import Image from 'next/image';

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg';

export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        {/* Haady Logo with Heartbeat Animation */}
        <div className="animate-heartbeat">
          <Image
            src={HAADY_LOGO_URL}
            alt="Haady"
            width={64}
            height={64}
            className="w-16 h-16"
            priority
          />
        </div>
        
        {/* Loading text */}
        <p className="text-sm font-medium text-gray-500 shimmer-text">
          Loading...
        </p>
      </div>
    </div>
  );
}

