'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background px-4 text-center">
            <div className="flex flex-col items-center space-y-4">
                <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
                    <AlertTriangle className="h-10 w-10 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Something went wrong!</h2>
                <p className="max-w-[500px] text-muted-foreground">
                    We apologize for the inconvenience. An unexpected error has occurred.
                </p>
                <div className="flex gap-4 pt-4">
                    <Button onClick={() => reset()}>Try again</Button>
                    <Button variant="outline" onClick={() => window.location.href = '/'}>
                        Go Home
                    </Button>
                </div>
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-8 max-w-2xl overflow-auto rounded-lg bg-muted p-4 text-left font-mono text-sm">
                        <p className="font-bold text-destructive">{error.name}</p>
                        <p className="mt-1">{error.message}</p>
                        {error.digest && <p className="mt-2 text-xs text-muted-foreground">Digest: {error.digest}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
