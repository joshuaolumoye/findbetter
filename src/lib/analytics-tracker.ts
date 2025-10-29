// File: src/lib/analytics-tracker.ts
// Client-side analytics tracking library

interface PageViewData {
  sessionId: string;
  pagePath: string;
  pageTitle: string;
  referrer: string;
  userAgent: string;
  screenResolution: string;
  deviceType: string;
  canton?: string;
}

interface PerformanceData {
  sessionId: string;
  pagePath: string;
  loadTime: number;
  domReady: number;
  firstPaint: number;
  timeOnPage: number;
  scrollDepth: number;
  interactionsCount: number;
}

interface ClickEventData {
  sessionId: string;
  pagePath: string;
  elementType: string;
  elementId: string;
  elementClass: string;
  elementText: string;
  clickX: number;
  clickY: number;
}

class AnalyticsTracker {
  private sessionId: string;
  private pageLoadTime: number;
  private lastActivityTime: number;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private interactionsCount: number = 0;
  private maxScrollDepth: number = 0;
  private isTracking: boolean = false;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.pageLoadTime = Date.now();
    this.lastActivityTime = Date.now();
    this.initialize();
  }

  // Initialize tracking
  private initialize() {
    if (typeof window === 'undefined') return;
    
    this.isTracking = true;

    // Track page view on load
    window.addEventListener('load', () => {
      this.trackPageView();
      this.startHeartbeat();
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackPageLeave();
        this.stopHeartbeat();
      } else {
        this.trackPageView();
        this.startHeartbeat();
      }
    });

    // Track clicks
    document.addEventListener('click', (e) => {
      this.trackClick(e);
      this.interactionsCount++;
    });

    // Track scroll depth
    window.addEventListener('scroll', () => {
      const scrollPercentage = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      this.maxScrollDepth = Math.max(this.maxScrollDepth, scrollPercentage || 0);
    });

    // Track before unload
    window.addEventListener('beforeunload', () => {
      this.trackPagePerformance();
      this.sendEndSession();
    });

    // Track form interactions
    this.trackFormInteractions();
  }

  // Get or create session ID
  private getOrCreateSessionId(): string {
    const storageKey = 'analytics_session_id';
    const sessionDuration = 30 * 60 * 1000; // 30 minutes

    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const { id, timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp < sessionDuration) {
          return id;
        }
      }
    } catch (e) {
      console.error('Error reading session:', e);
    }

    // Create new session
    const newSessionId = this.generateSessionId();
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

  // Generate unique session ID
  private generateSessionId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // Detect device type
  private getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  // Get canton from postal code (if available in URL or form)
  private getCanton(): string | undefined {
    const urlParams = new URLSearchParams(window.location.search);
    const plz = urlParams.get('plz') || urlParams.get('postalCode');
    
    if (plz) {
      // Simple mapping - you can enhance this
      const plzNum = parseInt(plz);
      if (plzNum >= 8000 && plzNum <= 8999) return 'ZH';
      if (plzNum >= 3000 && plzNum <= 3999) return 'BE';
      if (plzNum >= 4000 && plzNum <= 4999) return 'BS/BL';
      if (plzNum >= 6000 && plzNum <= 6999) return 'LU';
      if (plzNum >= 9000 && plzNum <= 9999) return 'SG';
    }
    
    return undefined;
  }

  // Track page view
  private async trackPageView() {
    const data: PageViewData = {
      sessionId: this.sessionId,
      pagePath: window.location.pathname,
      pageTitle: document.title,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      deviceType: this.getDeviceType(),
      canton: this.getCanton()
    };

    await this.sendToAPI('/api/analytics/track', {
      type: 'pageview',
      data
    });

    // Update active users
    await this.updateActiveUser();
  }

  // Track page performance
  private async trackPagePerformance() {
    if (!this.isTracking) return;

    const timeOnPage = Math.round((Date.now() - this.pageLoadTime) / 1000);

    const performanceData: PerformanceData = {
      sessionId: this.sessionId,
      pagePath: window.location.pathname,
      loadTime: 0,
      domReady: 0,
      firstPaint: 0,
      timeOnPage,
      scrollDepth: this.maxScrollDepth,
      interactionsCount: this.interactionsCount
    };

    // Get performance metrics if available
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      performanceData.loadTime = timing.loadEventEnd - timing.navigationStart;
      performanceData.domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
    }

    // Get paint timing if available
    if (window.performance && window.performance.getEntriesByType) {
      const paintEntries = window.performance.getEntriesByType('paint');
      const firstPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (firstPaint) {
        performanceData.firstPaint = Math.round(firstPaint.startTime);
      }
    }

    await this.sendToAPI('/api/analytics/track', {
      type: 'performance',
      data: performanceData
    });
  }

  // Track click events
  private async trackClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    
    const data: ClickEventData = {
      sessionId: this.sessionId,
      pagePath: window.location.pathname,
      elementType: target.tagName.toLowerCase(),
      elementId: target.id || '',
      elementClass: target.className || '',
      elementText: target.textContent?.substring(0, 100) || '',
      clickX: event.clientX,
      clickY: event.clientY
    };

    await this.sendToAPI('/api/analytics/track', {
      type: 'click',
      data
    });
  }

  // Track form interactions
  private trackFormInteractions() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      const formName = form.getAttribute('name') || form.id || 'unnamed_form';
      let formStarted = false;

      // Track form start
      form.addEventListener('focusin', () => {
        if (!formStarted) {
          formStarted = true;
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
      });

      // Track form submission
      form.addEventListener('submit', () => {
        this.sendToAPI('/api/analytics/track', {
          type: 'form_interaction',
          data: {
            sessionId: this.sessionId,
            formName,
            eventType: 'completed',
            timeSpent: Math.round((Date.now() - this.pageLoadTime) / 1000)
          }
        });
      });

      // Track form abandonment
      window.addEventListener('beforeunload', () => {
        if (formStarted && !form.querySelector('input[type="submit"]:disabled')) {
          this.sendToAPI('/api/analytics/track', {
            type: 'form_interaction',
            data: {
              sessionId: this.sessionId,
              formName,
              eventType: 'abandoned',
              timeSpent: Math.round((Date.now() - this.pageLoadTime) / 1000)
            }
          });
        }
      });
    });
  }

  // Track page leave
  private trackPageLeave() {
    this.trackPagePerformance();
  }

  // Update active user status
  private async updateActiveUser() {
    await this.sendToAPI('/api/analytics/track', {
      type: 'active_user',
      data: {
        sessionId: this.sessionId,
        currentPage: window.location.pathname,
        deviceType: this.getDeviceType(),
        canton: this.getCanton()
      }
    });
  }

  // Start heartbeat to keep session alive
  private startHeartbeat() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      this.updateActiveUser();
    }, 60000); // Every 60 seconds
  }

  // Stop heartbeat
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Send end session event
  private async sendEndSession() {
    const sessionDuration = Math.round((Date.now() - this.pageLoadTime) / 1000);
    
    await this.sendToAPI('/api/analytics/track', {
      type: 'end_session',
      data: {
        sessionId: this.sessionId,
        duration: sessionDuration,
        pageCount: 1 // This should be tracked across navigation
      }
    });

    this.stopHeartbeat();
    this.isTracking = false;
  }

  // Send data to API
  private async sendToAPI(endpoint: string, payload: any) {
    try {
      // Use sendBeacon for better reliability on page unload
      if (navigator.sendBeacon && endpoint.includes('track')) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
      } else {
        // Fallback to fetch
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        });
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  // Public method to track custom events
  public trackEvent(eventName: string, eventData: any = {}) {
    this.sendToAPI('/api/analytics/track', {
      type: 'custom_event',
      data: {
        sessionId: this.sessionId,
        eventName,
        eventData,
        pagePath: window.location.pathname
      }
    });
  }

  // Public method to track conversions
  public trackConversion(conversionType: string, value: number = 0, metadata: any = {}) {
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

// Create singleton instance
let tracker: AnalyticsTracker | null = null;

export function initAnalytics() {
  if (typeof window !== 'undefined' && !tracker) {
    tracker = new AnalyticsTracker();
  }
  return tracker;
}

export function trackEvent(eventName: string, eventData: any = {}) {
  if (tracker) {
    tracker.trackEvent(eventName, eventData);
  }
}

export function trackConversion(conversionType: string, value: number = 0, metadata: any = {}) {
  if (tracker) {
    tracker.trackConversion(conversionType, value, metadata);
  }
}

// Auto-initialize on import (for convenience)
if (typeof window !== 'undefined') {
  initAnalytics();
}