import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background px-4 text-center">
            <div className="space-y-4">
                <h1 className="text-9xl font-bold tracking-tighter text-primary/10">404</h1>
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Page not found</h2>
                <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                </p>
                <div className="flex justify-center gap-4 pt-4">
                    <Button asChild defaultChecked>
                        <Link href="/">Back to Home</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/dashboard">Go to Dashboard</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
