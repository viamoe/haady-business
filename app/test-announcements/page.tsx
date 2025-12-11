'use client';

import { useAnnouncement } from '@/lib/use-announcement';
import { useStickyAnnouncement } from '@/lib/use-sticky-announcement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Bell, AlertTriangle, CheckCircle2, Info, Zap, MessageSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function TestAnnouncementsPage() {
  const { showAnnouncement, showFeatureAnnouncement, showUpdateAnnouncement } = useAnnouncement();
  const { showStickyAnnouncement, showOnboardingProgress, showNewProductAnnouncement } = useStickyAnnouncement();

  // Preview component example
  const dashboardPreview = (
    <div className="p-3 space-y-2 bg-white">
      <div className="text-xs font-semibold text-gray-700 mb-2">Dashboard Preview</div>
      <div className="space-y-1.5">
        <div className="h-2 bg-gray-200 rounded w-3/4"></div>
        <div className="h-2 bg-gray-200 rounded w-1/2"></div>
        <div className="h-2 bg-gray-200 rounded w-5/6"></div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="h-12 bg-blue-100 rounded"></div>
        <div className="h-12 bg-green-100 rounded"></div>
        <div className="h-12 bg-purple-100 rounded"></div>
      </div>
      <div className="mt-3 space-y-1">
        <div className="h-1.5 bg-gray-200 rounded"></div>
        <div className="h-1.5 bg-gray-200 rounded"></div>
        <div className="h-1.5 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  );

  const handleFeatureAnnouncement = () => {
    showFeatureAnnouncement(
      "Experience the all-new Dashboard!",
      "Be the first to try our next generation dashboard. Yes, you can easily switch back.",
      {
        ctaText: "Try it now",
        ctaLink: "/dashboard",
        previewComponent: dashboardPreview,
        priority: 10,
      }
    );
  };

  const handleFeatureWithImage = () => {
    showFeatureAnnouncement(
      "New Product Sync Feature",
      "Sync your products from all platforms in one click. Save time and stay organized.",
      {
        ctaText: "Learn More",
        ctaAction: () => {
          console.log('Feature clicked!');
        },
        imageUrl: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800",
        priority: 9,
      }
    );
  };

  const handleUpdateAnnouncement = () => {
    showUpdateAnnouncement(
      "New Update Available",
      "We've added new features to help you manage your business better. Check them out!",
      {
        ctaText: "View Updates",
        ctaLink: "/updates",
        priority: 8,
      }
    );
  };

  const handleInfoAnnouncement = () => {
    showAnnouncement({
      type: 'info',
      title: "Welcome to Haady!",
      description: "Get started by connecting your first store. It only takes a few minutes.",
      ctaText: "Get Started",
      ctaLink: "/dashboard",
      priority: 7,
    });
  };

  const handleSuccessAnnouncement = () => {
    showAnnouncement({
      type: 'success',
      title: "Store Connected Successfully!",
      description: "Your Shopify store has been connected. You can now start syncing products.",
      ctaText: "Sync Products",
      ctaLink: "/dashboard",
      priority: 6,
    });
  };

  const handleWarningAnnouncement = () => {
    showAnnouncement({
      type: 'warning',
      title: "Subscription Expiring Soon",
      description: "Your subscription will expire in 7 days. Please renew to continue using all features.",
      ctaText: "Renew Now",
      ctaLink: "/billing",
      persistent: true,
      priority: 15,
    });
  };

  const handlePersistentAnnouncement = () => {
    showAnnouncement({
      type: 'info',
      title: "Important Notice",
      description: "This announcement will persist until you dismiss it. It won't auto-dismiss.",
      ctaText: "Got it",
      persistent: true,
      priority: 12,
    });
  };

  const handleAnnouncementWithCustomAction = () => {
    showAnnouncement({
      type: 'feature',
      title: "Custom Action Announcement",
      description: "Click the button to see a custom action in the console.",
      ctaText: "Run Custom Action",
      ctaAction: () => {
        alert('Custom action executed!');
        console.log('Custom announcement action triggered!');
      },
      priority: 5,
    });
  };

  const handleAnnouncementWithoutCTA = () => {
    showAnnouncement({
      type: 'info',
      title: "Information Only",
      description: "This announcement doesn't have a call-to-action button. You can only dismiss it.",
      priority: 4,
    });
  };

  const handleNonDismissableAnnouncement = () => {
    showAnnouncement({
      type: 'warning',
      title: "Critical Notice",
      description: "This announcement cannot be dismissed. You must take action.",
      ctaText: "Take Action",
      ctaLink: "/settings",
      dismissable: false,
      priority: 20,
    });
  };

  const handleMultipleAnnouncements = () => {
    // Show multiple announcements with different priorities
    showAnnouncement({
      id: 'announcement-1',
      type: 'info',
      title: "First Announcement",
      description: "This is the first announcement (priority 3).",
      priority: 3,
    });

    setTimeout(() => {
      showAnnouncement({
        id: 'announcement-2',
        type: 'update',
        title: "Second Announcement",
        description: "This is the second announcement (priority 5) - it will show after the first.",
        priority: 5,
      });
    }, 1000);
  };

  // Sticky Announcement Handlers
  const handleStickyFeature = () => {
    showStickyAnnouncement({
      type: 'feature',
      title: 'New Feature Available',
      description: 'Try our new dashboard experience',
      ctaText: 'Try Now',
      ctaLink: '/dashboard',
      position: 'bottom',
    });
  };

  const handleStickyTop = () => {
    showStickyAnnouncement({
      type: 'info',
      title: 'Important Notice',
      description: 'This announcement appears at the top',
      position: 'top',
    });
  };

  const handleStickyWarning = () => {
    showStickyAnnouncement({
      type: 'warning',
      title: 'Action Required',
      description: 'Please complete your profile setup',
      ctaText: 'Complete Now',
      ctaLink: '/setup',
      position: 'bottom',
    });
  };

  const handleStickySuccess = () => {
    showStickyAnnouncement({
      type: 'success',
      title: 'Store Connected!',
      description: 'Your Shopify store has been successfully connected',
      ctaText: 'View Store',
      ctaLink: '/dashboard',
      position: 'bottom',
    });
  };

  const handleOnboardingProgress = () => {
    showOnboardingProgress(3, 5, 'Continue Setup', () => {
      console.log('Continue onboarding...');
    });
  };

  const handleNewProduct = () => {
    showNewProductAnnouncement('Advanced Analytics', '/products/analytics');
  };

  const handleStickyPersistent = () => {
    showStickyAnnouncement({
      type: 'update',
      title: 'System Update',
      description: 'New features have been added. Check them out!',
      ctaText: 'Learn More',
      persistent: true,
      position: 'bottom',
    });
  };

  const handleStickyNonDismissable = () => {
    showStickyAnnouncement({
      type: 'warning',
      title: 'Critical: Verify Your Email',
      description: 'Please verify your email address to continue',
      ctaText: 'Verify Now',
      dismissable: false,
      position: 'top',
    });
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Announcement System Test</h1>
          <p className="text-gray-600">
            Test all announcement types and features. Click any button to see the announcement modal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Feature Announcements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Feature Announcements
              </CardTitle>
              <CardDescription>
                Announce new features with preview
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={handleFeatureAnnouncement} className="w-full" variant="outline">
                Feature with Preview
              </Button>
              <Button onClick={handleFeatureWithImage} className="w-full" variant="outline">
                Feature with Image
              </Button>
            </CardContent>
          </Card>

          {/* Update Announcements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-500" />
                Update Announcements
              </CardTitle>
              <CardDescription>
                Announce updates and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleUpdateAnnouncement} className="w-full" variant="outline">
                Show Update
              </Button>
            </CardContent>
          </Card>

          {/* Info Announcements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-gray-500" />
                Info Announcements
              </CardTitle>
              <CardDescription>
                General information messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={handleInfoAnnouncement} className="w-full" variant="outline">
                Welcome Message
              </Button>
              <Button onClick={handleAnnouncementWithoutCTA} className="w-full" variant="outline">
                Info Only (No CTA)
              </Button>
            </CardContent>
          </Card>

          {/* Success Announcements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Success Announcements
              </CardTitle>
              <CardDescription>
                Success and confirmation messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleSuccessAnnouncement} className="w-full" variant="outline">
                Show Success
              </Button>
            </CardContent>
          </Card>

          {/* Warning Announcements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Warning Announcements
              </CardTitle>
              <CardDescription>
                Important warnings and notices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleWarningAnnouncement} className="w-full" variant="outline">
                Show Warning
              </Button>
            </CardContent>
          </Card>

          {/* Special Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                Special Features
              </CardTitle>
              <CardDescription>
                Advanced announcement features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={handlePersistentAnnouncement} className="w-full" variant="outline">
                Persistent Announcement
              </Button>
              <Button onClick={handleNonDismissableAnnouncement} className="w-full" variant="outline">
                Non-Dismissable
              </Button>
              <Button onClick={handleAnnouncementWithCustomAction} className="w-full" variant="outline">
                Custom Action
              </Button>
              <Button onClick={handleMultipleAnnouncements} className="w-full" variant="outline">
                Multiple Announcements
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sticky Announcements Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Sticky Announcements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                  Sticky Feature
                </CardTitle>
                <CardDescription>
                  Bottom sticky banner
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleStickyFeature} className="w-full" variant="outline">
                  Show Feature Sticky
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  Top Position
                </CardTitle>
                <CardDescription>
                  Sticky at top of screen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleStickyTop} className="w-full" variant="outline">
                  Show Top Sticky
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-amber-500" />
                  Warning Sticky
                </CardTitle>
                <CardDescription>
                  Warning banner
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleStickyWarning} className="w-full" variant="outline">
                  Show Warning Sticky
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-500" />
                  Success Sticky
                </CardTitle>
                <CardDescription>
                  Success notification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleStickySuccess} className="w-full" variant="outline">
                  Show Success Sticky
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-gray-500" />
                  Onboarding Progress
                </CardTitle>
                <CardDescription>
                  Track onboarding steps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleOnboardingProgress} className="w-full" variant="outline">
                  Show Onboarding Progress
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                  New Product
                </CardTitle>
                <CardDescription>
                  Product announcement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleNewProduct} className="w-full" variant="outline">
                  Show New Product
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  Persistent Sticky
                </CardTitle>
                <CardDescription>
                  Won't auto-dismiss
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleStickyPersistent} className="w-full" variant="outline">
                  Show Persistent
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-red-500" />
                  Non-Dismissable
                </CardTitle>
                <CardDescription>
                  Cannot be closed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleStickyNonDismissable} className="w-full" variant="outline">
                  Show Non-Dismissable
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p><strong>1. Feature Announcements:</strong> Shows with preview component or image on the left side.</p>
            <p><strong>2. Update Announcements:</strong> Blue-themed announcements for updates.</p>
            <p><strong>3. Info Announcements:</strong> General information with gray theme.</p>
            <p><strong>4. Success Announcements:</strong> Green-themed success messages.</p>
            <p><strong>5. Warning Announcements:</strong> Amber-themed warnings (can be persistent).</p>
            <p><strong>6. Persistent:</strong> Won't auto-dismiss, must be manually closed.</p>
            <p><strong>7. Non-Dismissable:</strong> Cannot be closed, must take action.</p>
            <p><strong>8. Custom Action:</strong> Executes custom JavaScript function on CTA click.</p>
            <p><strong>9. Multiple:</strong> Shows how announcements queue based on priority.</p>
            <p className="pt-2 text-xs text-gray-500">
              <strong>Note:</strong> Dismissed announcements are stored in localStorage and won't show again until cleared.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

