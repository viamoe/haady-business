/**
 * Example usage of the Announcement System
 * 
 * This file shows how to use the announcement system in your components
 */

'use client';

import React from 'react';
import { useAnnouncement } from '@/lib/use-announcement';
import { Button } from '@/components/ui/button';

export function AnnouncementExample() {
  const { showFeatureAnnouncement, showUpdateAnnouncement, showAnnouncement } = useAnnouncement();

  // Example 1: Simple feature announcement
  const handleShowFeature = () => {
    showFeatureAnnouncement(
      "Experience the all-new Dashboard!",
      "Be the first to try our next generation dashboard. Yes, you can easily switch back.",
      {
        ctaText: "Try it now",
        ctaLink: "/dashboard",
        priority: 10,
      }
    );
  };

  // Example 2: Feature announcement with preview component
  const handleShowFeatureWithPreview = () => {
    showFeatureAnnouncement(
      "Experience the all-new Dashboard!",
      "Be the first to try our next generation dashboard. Yes, you can easily switch back.",
      {
        ctaText: "Try it now",
        ctaAction: () => {
          console.log('Navigating to new dashboard...');
          // Your navigation logic here
        },
        previewComponent: (
          <div className="p-4 space-y-2">
            <div className="text-xs font-semibold text-gray-700">Dashboard Preview</div>
            <div className="h-32 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
              <span className="text-gray-400 text-sm">Preview Content</span>
            </div>
          </div>
        ),
        priority: 10,
      }
    );
  };

  // Example 3: Update announcement
  const handleShowUpdate = () => {
    showUpdateAnnouncement(
      "New Update Available",
      "We've added new features to help you manage your business better. Check them out!",
      {
        ctaText: "Learn More",
        ctaLink: "/updates",
        priority: 5,
      }
    );
  };

  // Example 4: Custom announcement with image
  const handleShowCustom = () => {
    showAnnouncement({
      type: 'info',
      title: "Welcome to Haady!",
      description: "Get started by connecting your first store.",
      ctaText: "Get Started",
      imageUrl: "https://example.com/welcome-image.jpg",
      priority: 8,
    });
  };

  // Example 5: Persistent announcement (won't auto-dismiss)
  const handleShowPersistent = () => {
    showAnnouncement({
      type: 'warning',
      title: "Important Notice",
      description: "Your subscription will expire soon. Please renew to continue using all features.",
      ctaText: "Renew Now",
      ctaLink: "/billing",
      persistent: true,
      priority: 15,
    });
  };

  return (
    <div className="space-y-4 p-8">
      <h2 className="text-2xl font-bold">Announcement Examples</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <Button onClick={handleShowFeature}>
          Show Feature Announcement
        </Button>
        
        <Button onClick={handleShowFeatureWithPreview}>
          Show Feature with Preview
        </Button>
        
        <Button onClick={handleShowUpdate}>
          Show Update Announcement
        </Button>
        
        <Button onClick={handleShowCustom}>
          Show Custom Announcement
        </Button>
        
        <Button onClick={handleShowPersistent}>
          Show Persistent Announcement
        </Button>
      </div>
    </div>
  );
}

/**
 * Example: Auto-show announcement on page load
 */
export function useAutoAnnouncement() {
  const { showFeatureAnnouncement } = useAnnouncement();

  React.useEffect(() => {
    // Check if announcement was already shown
    const announcementId = 'new-dashboard-feature-v2';
    const wasShown = localStorage.getItem(`announcement-${announcementId}`);
    
    if (!wasShown) {
      // Show after a delay
      setTimeout(() => {
        showFeatureAnnouncement(
          "Experience the all-new Dashboard!",
          "Be the first to try our next generation dashboard. Yes, you can easily switch back.",
          {
            ctaText: "Try it now",
            ctaLink: "/dashboard",
            priority: 10,
          }
        );
      }, 2000);
    }
  }, [showFeatureAnnouncement]);
}

