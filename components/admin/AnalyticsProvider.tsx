// File: src/components/AnalyticsProvider.tsx
'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

class AnalyticsTracker {
  private sessionId: string;
  private pageLoadTime: number;
  private maxScrollDepth: number = 0;
  private interactionsCount: number = 0;
  private isTracking: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.pageLoadTime = Date.now();
  }

  initialize() {
    if (typeof window === 'undefined' || this.isInitialized) return;
    
    this.isInitialized = true;
    this.isTracking = true;
    
    // Track initial page view
    this.trackPageView();
    
    // Setup all event listeners
    this.setupEventListeners();
    
    // Start heartbeat
    this.startHeartbeat();
  }

  cleanup() {
    this.stopHeartbeat();
    this.isTracking = false;
    this.isInitialized = false;
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') {
      return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }

    const storageKey = 'analytics_session_id';
    const sessionDuration = 30 * 60 * 1000; // 30 minutes

    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const { id, timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp < sessionDuration) {
          // Update timestamp
          sessionStorage.setItem(
            storageKey,
            JSON.stringify({ id, timestamp: Date.now() })
          );
          return id;
        }
      }
    } catch (e) {
      console.error('Error reading session:', e);
    }

    const newSessionId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ id: newSessionId, timestamp: Date.now() })
      );
    } catch (e) {
      console.error('Error storing session:', e);
    }

    return newSessionId;
  }

  private getDeviceType(): string {
    if (typeof window === 'undefined') return 'unknown';
    
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private getCanton(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    
    const urlParams = new URLSearchParams(window.location.search);
    const plz = urlParams.get('plz') || urlParams.get('postalCode');
    
    if (plz) {
      const plzNum = parseInt(plz);
      if (plzNum >= 8000 && plzNum <= 8999) return 'ZH';
      if (plzNum >= 3000 && plzNum <= 3999) return 'BE';
      if (plzNum >= 4000 && plzNum <= 4999) return 'BS/BL';
      if (plzNum >= 6000 && plzNum <= 6999) return 'LU';
      if (plzNum >= 9000 && plzNum <= 9999) return 'SG';
      if (plzNum >= 1000 && plzNum <= 1299) return 'VD';
      if (plzNum >= 1200 && plzNum <= 1299) return 'GE';
    }
    
    return undefined;
  }

  private setupEventListeners() {
    if (typeof window === 'undefined') return;

    // Track clicks
    const handleClick = (e: MouseEvent) => {
      this.trackClick(e);
      this.interactionsCount++;
    };
    document.addEventListener('click', handleClick);

    // Track scroll depth
    const handleScroll = () => {
      const scrollPercentage = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      this.maxScrollDepth = Math.max(this.maxScrollDepth, scrollPercentage || 0);
    };
    window.addEventListener('scroll', handleScroll);

    // Track before unload
    const handleBeforeUnload = () => {
      this.trackPagePerformance();
      this.sendEndSession();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Track visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        this.trackPagePerformance();
        this.stopHeartbeat();
      } else {
        this.startHeartbeat();
        this.updateActiveUser();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track form interactions
    this.trackFormInteractions();
  }

  trackPageView() {
    if (typeof window === 'undefined') return;

    const data = {
      sessionId: this.sessionId,
      pagePath: window.location.pathname,
      pageTitle: document.title,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      deviceType: this.getDeviceType(),
      canton: this.getCanton()
    };

    this.sendToAPI('/api/analytics/track', {
      type: 'pageview',
      data
    });

    this.updateActiveUser();
    this.pageLoadTime = Date.now();
    this.maxScrollDepth = 0;
    this.interactionsCount = 0;
  }

  private trackPagePerformance() {
    if (!this.isTracking || typeof window === 'undefined') return;

    const timeOnPage = Math.round((Date.now() - this.pageLoadTime) / 1000);

    const performanceData = {
      sessionId: this.sessionId,
      pagePath: window.location.pathname,
      loadTime: 0,
      domReady: 0,
      firstPaint: 0,
      timeOnPage,
      scrollDepth: this.maxScrollDepth,
      interactionsCount: this.interactionsCount
    };

    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      performanceData.loadTime = timing.loadEventEnd - timing.navigationStart;
      performanceData.domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
    }

    if (window.performance && window.performance.getEntriesByType) {
      const paintEntries = window.performance.getEntriesByType('paint');
      const firstPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (firstPaint) {
        performanceData.firstPaint = Math.round(firstPaint.startTime);
      }
    }

    this.sendToAPI('/api/analytics/track', {
      type: 'performance',
      data: performanceData
    });
  }

  private trackClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    
    const data = {
      sessionId: this.sessionId,
      pagePath: window.location.pathname,
      elementType: target.tagName.toLowerCase(),
      elementId: target.id || '',
      elementClass: target.className || '',
      elementText: target.textContent?.substring(0, 100) || '',
      clickX: event.clientX,
      clickY: event.clientY
    };

    this.sendToAPI('/api/analytics/track', {
      type: 'click',
      data
    });
  }

  private trackFormInteractions() {
    if (typeof window === 'undefined') return;

    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      const formName = form.getAttribute('name') || form.id || 'unnamed_form';
      let formStarted = false;
      let formStartTime = 0;

      const handleFocusIn = () => {
        if (!formStarted) {
          formStarted = true;
          formStartTime = Date.now();
          this.sendToAPI('/api/analytics/track', {
            type: 'form_interaction',
            data: {
              sessionId: this.sessionId,
              formName,
              eventType: 'started',
              timeSpent: 0
            }
          });
        }
      };

      const handleSubmit = () => {
        const timeSpent = Math.round((Date.now() - formStartTime) / 1000);
        this.sendToAPI('/api/analytics/track', {
          type: 'form_interaction',
          data: {
            sessionId: this.sessionId,
            formName,
            eventType: 'completed',
            timeSpent
          }
        });
      };

      form.addEventListener('focusin', handleFocusIn);
      form.addEventListener('submit', handleSubmit);
    });
  }

  private updateActiveUser() {
    if (typeof window === 'undefined') return;

    this.sendToAPI('/api/analytics/track', {
      type: 'active_user',
      data: {
        sessionId: this.sessionId,
        currentPage: window.location.pathname,
        deviceType: this.getDeviceType(),
        canton: this.getCanton()
      }
    });
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      this.updateActiveUser();
    }, 60000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendEndSession() {
    if (typeof window === 'undefined') return;

    const sessionDuration = Math.round((Date.now() - this.pageLoadTime) / 1000);
    
    this.sendToAPI('/api/analytics/track', {
      type: 'end_session',
      data: {
        sessionId: this.sessionId,
        duration: sessionDuration
      }
    });

    this.stopHeartbeat();
    this.isTracking = false;
  }

  private sendToAPI(endpoint: string, payload: any) {
    try {
      if (typeof window === 'undefined') return;

      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
      } else {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(err => console.error('Analytics error:', err));
      }
    } catch (error) {
      console.error('Analytics send error:', error);
    }
  }

  public trackConversion(conversionType: string, value: number = 0, metadata: any = {}) {
    if (typeof window === 'undefined') return;

    this.sendToAPI('/api/analytics/track', {
      type: 'conversion',
      data: {
        sessionId: this.sessionId,
        conversionType,
        conversionValue: value,
        pagePath: window.location.pathname,
        timeToConvert: Math.round((Date.now() - this.pageLoadTime) / 1000),
        metadata
      }
    });
  }
}

// Singleton tracker instance
let trackerInstance: AnalyticsTracker | null = null;

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip tracking for admin pages
    if (pathname?.startsWith('/admin')) {
      return;
    }

    // Initialize tracker on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (!trackerInstance) {
        trackerInstance = new AnalyticsTracker();
      }
      trackerInstance.initialize();
    } else {
      // Track page view on route change
      if (trackerInstance) {
        trackerInstance.trackPageView();
      }
    }
    
  }, [pathname]);

  return <>{children}</>;
}

// Export tracking functions
export function trackConversion(conversionType: string, value: number = 0, metadata: any = {}) {
  if (trackerInstance) {
    trackerInstance.trackConversion(conversionType, value, metadata);
  }
}

export function trackCustomEvent(eventName: string, eventData: any = {}) {
  if (trackerInstance && typeof window !== 'undefined') {
    trackerInstance['sendToAPI']('/api/analytics/track', {
      type: 'custom_event',
      data: {
        sessionId: trackerInstance['sessionId'],
        eventName,
        eventData,
        pagePath: window.location.pathname
      }
    });
  }
}