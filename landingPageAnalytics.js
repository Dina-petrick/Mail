(function() {
  'use strict';

  // UUID generator
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Simple user agent parser
  function parseUserAgent(ua) {
    const os = 'Unknown';
    const browser = 'Unknown';
    if (/Windows/.test(ua)) os = 'Windows';
    else if (/Mac/.test(ua)) os = 'Mac';
    else if (/Linux/.test(ua)) os = 'Linux';
    else if (/Android/.test(ua)) os = 'Android';
    if (/Chrome/.test(ua) && !/Edge/.test(ua)) browser = 'Google Chrome';
    else if (/Firefox/.test(ua)) browser = 'Firefox';
    else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
    else if (/Edge/.test(ua)) browser = 'Microsoft Edge';
    return { os, browser };
  }

  // Analytics Tracker
  class AnalyticsTracker {
    constructor() {
      this.tenantId = window?._currentTenant?._tenantId || null;
      this.persistentAnonymousId = localStorage.getItem('analytics_persistentId') || generateUUID();
      localStorage.setItem('analytics_persistentId', this.persistentAnonymousId);
      this.userId = localStorage.getItem('analytics_userId') || `usr_${generateUUID().slice(0, 7).toUpperCase()}`;
      localStorage.setItem('analytics_userId', this.userId);
      this.firstVisit = localStorage.getItem('analytics_firstVisit') || Date.now().toString();
      localStorage.setItem('analytics_firstVisit', this.firstVisit);
      this.lastVisit = localStorage.getItem('analytics_lastVisit') || Date.now().toString();
      localStorage.setItem('analytics_lastVisit', Date.now().toString());
      this.sessionCount = parseInt(localStorage.getItem('analytics_sessionCount') || '0', 10) + 1;
      localStorage.setItem('analytics_sessionCount', this.sessionCount.toString());

      this.sessionId = localStorage.getItem('analytics_sessionId') || generateUUID();
      this.sessionStartTime = parseInt(localStorage.getItem('analytics_sessionStart') || '0', 10);
      const now = Date.now();
      if (now - this.sessionStartTime > 30 * 60 * 1000) { // New session if >30min
        this.sessionId = generateUUID();
        this.sessionStartTime = now;
        localStorage.setItem('analytics_sessionId', this.sessionId);
        localStorage.setItem('analytics_sessionStart', this.sessionStartTime.toString());
      } else {
        localStorage.setItem('analytics_sessionStart', this.sessionStartTime.toString());
      }

      this.pageViewsInSession = parseInt(localStorage.getItem('analytics_pageViews') || '0', 10) + 1;
      localStorage.setItem('analytics_pageViews', this.pageViewsInSession.toString());

      this.eventsInSession = 0;
      this.startTime = performance.now();
      this.pageStartTime = Date.now();
      this.activeTime = 0;
      this.lastActiveTime = Date.now();
      this.maxScrollY = 0;
      this.totalScrollDistance = 0;
      this.lastScrollTime = Date.now();
      this.scrollSamples = [];
      this.movementPath = [];
      this.clicks = [];
      this.scrollPath = [];
      this.exitIntentTriggered = false;
      this.lastMouseY = 0;
      this.rageClickCount = 0;
      this.deadClickCount = 0;
      this.errorClickCount = 0;
      this.franticScrolls = 0;
      this.tabPressCount = 0;
      this.copyPasteEvents = [];
      this.elementImpressions = [];
      this.jsErrors = [];
      this.networkErrors = [];
      this.cspViolations = [];
      this.unhandledPromiseRejections = [];
      this.formData = null;
      this.timeToFirstInteraction = null;
      this.firstInteractionTime = null;

      // Performance metrics
      this.coreWebVitals = { lcp: { value: null, elementSelector: null }, cls: { value: 0, sources: [] }, inp: { value: null, elementSelector: null } };
      this.navigationTiming = {};
      this.resourceTiming = { slowResources: [], failedResources: [] };
      this.longTasks = []; // Commented out in spec, but included for completeness

      // Source parsing
      this.source = this.parseSource();

      // Trackers
      this.trackVisibility();
      this.trackInteractions();
      this.trackPerformance();
      this.trackErrors();
      this.trackForm();
      this.updateActiveTime();
    }

    parseSource() {
      const referrer = document.referrer || '';
      const currentUrl = window.location.href;
      const searchParams = new URLSearchParams(window.location.search);
      const utmParams = {
        source: searchParams.get('utm_source') || '',
        medium: searchParams.get('utm_medium') || '',
        campaign: searchParams.get('utm_campaign') || '',
        term: searchParams.get('utm_term') || '',
        content: searchParams.get('utm_content') || ''
      };
      const gclid = searchParams.get('gclid') || '';
      let channel = 'direct';
      if (referrer.includes('facebook.com')) channel = 'Facebook';
      else if (referrer.includes('google.com')) channel = 'Google';
      // Add more as needed
      const firstReferrer = localStorage.getItem('analytics_firstReferrer') || referrer;
      if (!localStorage.getItem('analytics_firstReferrer')) {
        localStorage.setItem('analytics_firstReferrer', firstReferrer);
      }
      return {
        channel,
        referrerUrl: referrer,
        landingUrl: currentUrl,
        firstReferrer,
        utmParams,
        gclid
      };
    }

    calculateTimeDiff(timestamp) {
      const diffMs = Date.now() - parseInt(timestamp, 10);
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${days}d ${hours}h ${minutes}m`;
    }

    getUserInfo() {
      return {
        userId: this.userId,
        persistentAnonymousId: this.persistentAnonymousId,
        sessionCount: this.sessionCount,
        timeSinceFirstVisit: this.calculateTimeDiff(this.firstVisit),
        timeSinceLastVisit: this.calculateTimeDiff(this.lastVisit)
      };
    }

    getSessionInfo() {
      const sessionDurationSec = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      const isEngaged = this.activeTime > 10; // >10s active
      const isBounce = this.pageViewsInSession === 1 && sessionDurationSec < 10;
      return {
        sessionId: this.sessionId,
        sessionStartTime: new Date(this.sessionStartTime).toISOString(),
        sessionDurationSec,
        activeDurationSec: Math.floor(this.activeTime),
        isEngaged,
        isBounce,
        pageViewsInSession: this.pageViewsInSession,
        eventsInSession: this.eventsInSession,
        source: this.source
      };
    }

    getPageInfo() {
      const url = window.location.href;
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;
      const title = document.title;
      const pageId = 'homepage_v3'; // Hardcoded as per example; adjust dynamically if needed
      const canonicalUrl = document.querySelector('link[rel="canonical"]')?.href || url;
      const language = navigator.language;
      const isIframe = window.self !== window.top;
      return {
        url,
        path,
        hash,
        search,
        title,
        pageId,
        canonicalUrl,
        language,
        isIframe
      };
    }

    async getLocationInfo() {
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        const geoRes = await fetch(`http://ip-api.com/json/${ipData.ip}`);
        const geoData = await geoRes.json();
        if (geoData.status === 'success') {
          return {
            ip: ipData.ip,
            countryCode: geoData.countryCode,
            regionName: geoData.regionName,
            city: geoData.city,
            lat: geoData.lat,
            lon: geoData.lon
          };
        }
      } catch (err) {
        console.warn('Geolocation fetch failed:', err);
      }
      return {
        ip: null,
        countryCode: null,
        regionName: null,
        city: null,
        lat: null,
        lon: null
      };
    }

    getDeviceInfo() {
      const ua = navigator.userAgent;
      const { os, browser } = parseUserAgent(ua);
      const type = window.innerWidth > 1024 ? 'desktop' : 'mobile';
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return {
        timezone,
        type,
        os,
        browser,
        userAgent: ua,
        capabilities: {}
      };
    }

    getPerformanceInfo() {
      // Navigation Timing
      const navEntry = performance.getEntriesByType('navigation')[0];
      if (navEntry) {
        const timings = navEntry.toJSON();
        this.navigationTiming = {
          pageLoadTimeSec: (timings.loadEventEnd - timings.navigationStart) / 1000,
          requestSec: (timings.responseStart - timings.requestStart) / 1000,
          responseSec: (timings.responseEnd - timings.responseStart) / 1000
        };
      }

      // Resource Timing
      const resources = performance.getEntriesByType('resource');
      resources.forEach(res => {
        const durationMs = res.duration;
        if (durationMs > 3000) {
          this.resourceTiming.slowResources.push({
            name: res.name,
            type: res.initiatorType,
            durationMs: Math.round(durationMs)
          });
        }
        if (res.responseStatus >= 400) { // Assuming responseStatus available
          this.resourceTiming.failedResources.push({
            name: res.name,
            type: res.initiatorType,
            statusCode: res.responseStatus
          });
        }
      });

      // Long Tasks (optional)
      // Use PerformanceObserver if needed

      return {
        coreWebVitals: this.coreWebVitals,
        navigationTiming: this.navigationTiming,
        resourceTiming: this.resourceTiming
        // longTasks: this.longTasks
      };
    }

    trackPerformance() {
      // LCP
      new PerformanceObserver((list => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.coreWebVitals.lcp = {
          value: lastEntry.startTime / 1000,
          elementSelector: lastEntry.element ? lastEntry.element.tagName : null // Simplified
        };
      })).observe({ entryTypes: ['largest-contentful-paint'] });

      // CLS
      let clsValue = 0;
      new PerformanceObserver((list => {
        list.getEntries().forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.coreWebVitals.cls.sources.push({
              selector: entry.sources?.[0]?.previousRect ? 'dynamic' : '', // Simplified
              shiftAmount: entry.value
            });
          }
        });
        this.coreWebVitals.cls.value = clsValue;
      })).observe({ entryTypes: ['layout-shift'] });

      // INP
      new PerformanceObserver((list => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.coreWebVitals.inp = {
          value: lastEntry.processingStart ? (lastEntry.duration / 1000) : null,
          elementSelector: lastEntry.element ? lastEntry.element.id || null : null
        };
      })).observe({ entryTypes: ['first-input', 'event-timing'] }); // INP uses event-timing in modern browsers
    }

    getInteractionInfo() {
      const timeOnPageSec = Math.floor((Date.now() - this.pageStartTime) / 1000);
      const totalScrollHeight = document.documentElement.scrollHeight;
      const maxScrollPercent = Math.min((this.maxScrollY / totalScrollHeight) * 100, 100);
      const avgScrollVelocity = this.scrollSamples.length > 0 ? this.totalScrollDistance / ((Date.now() - this.pageStartTime) / 1000) : 0;

      // Exit Intent
      const exitIntent = {
        triggered: this.exitIntentTriggered,
        delayMs: this.exitIntentTriggered ? Math.floor(Date.now() - this.pageStartTime) : 0,
        position: { x: 0, y: 0 }, // Set on trigger
        movementType: 'top_exit'
      };

      return {
        pageMetrics: {
          timeOnPageSec,
          activeTimeOnPageSec: Math.floor(this.activeTime),
          maxScrollPercent,
          avgScrollVelocity
        },
        heatmap: {
          movementPath: this.movementPath.slice(0, 3), // Limit to 3 as example
          clicks: this.clicks.slice(0, 1), // Limit
          scrollPath: this.scrollPath.slice(0, 2),
          exitIntent
        },
        frustrationSignals: {
          rageClickCount: this.rageClickCount,
          deadClickCount: this.deadClickCount,
          errorClickCount: this.errorClickCount,
          franticScrolls: this.franticScrolls
        },
        elementImpressions: this.elementImpressions.slice(0, 1),
        keyboardInteractions: {
          tabPressCount: this.tabPressCount,
          copyPasteEvents: this.copyPasteEvents.slice(0, 1)
        }
      };
    }

    trackInteractions() {
      // Mouse movement sampling
      let lastMoveTime = 0;
      document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - lastMoveTime > 1000) { // Sample every 1s
          this.movementPath.push({ x: e.clientX, y: e.clientY, t: now - this.pageStartTime });
          lastMoveTime = now;
        }
        // Exit intent detection
        if (e.clientY <= 5 && this.lastMouseY > e.clientY + 20 && !this.exitIntentTriggered) {
          this.exitIntentTriggered = true;
          exitIntent.position = { x: e.clientX, y: e.clientY };
          this.triggerExitIntent();
        }
        this.lastMouseY = e.clientY;
      });

      // Clicks
      document.addEventListener('click', (e) => {
        const element = e.target;
        const selector = this.getSelector(element);
        const text = element.textContent?.trim().substring(0, 50) || '';
        const click = {
          x: e.clientX,
          y: e.clientY,
          t: Date.now() - this.pageStartTime,
          button: e.button === 0 ? 'left' : 'right',
          elementSelector: selector,
          elementText: text,
          isDeadClick: false, // Simplified: check if no href/onclick etc.
          isRageClick: false
        };
        this.clicks.push(click);
        this.eventsInSession++;

        // Rage click detection (simplified: multiple clicks in 1s)
        const recentClicks = this.clicks.filter(c => (Date.now() - (this.pageStartTime + c.t)) < 1000);
        if (recentClicks.length > 3 && recentClicks.every(c => Math.hypot(c.x - e.clientX, c.y - e.clientY) < 50)) {
          this.rageClickCount++;
        }

        // Dead click: if non-interactive
        if (!element.href && !element.onclick && element.tagName !== 'BUTTON' && element.tagName !== 'INPUT') {
          this.deadClickCount++;
        }

        // Error click: wrap in try-catch if needed, but simplified
      }, true);

      // Scroll
      let lastScrollY = 0;
      document.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        this.maxScrollY = Math.max(this.maxScrollY, scrollY);
        const now = Date.now();
        const deltaY = Math.abs(scrollY - lastScrollY);
        this.totalScrollDistance += deltaY;
        this.scrollSamples.push({ delta: deltaY, time: now });
        this.scrollPath.push({ scrollY, t: now - this.pageStartTime });

        // Frantic scrolls: rapid scroll >1000px/s
        if (this.scrollSamples.length > 1) {
          const timeDiff = (now - this.scrollSamples[this.scrollSamples.length - 2].time) / 1000;
          if (deltaY / timeDiff > 1000) this.franticScrolls++;
        }

        lastScrollY = scrollY;
      });

      // Keyboard
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') this.tabPressCount++;
        // Copy/paste on inputs
        if (e.key === 'v' && e.ctrlKey) {
          // Simplified paste tracking
          setTimeout(() => {
            const active = document.activeElement;
            if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') {
              this.copyPasteEvents.push({
                action: 'paste',
                fieldSelector: `#${active.id}`,
                t: Date.now() - this.pageStartTime
              });
            }
          }, 0);
        }
      });

      // Element impressions (track specific elements)
      const trackableElements = document.querySelectorAll('#pricing-table, [data-track]');
      trackableElements.forEach(el => {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const viewTime = Date.now() - this.pageStartTime;
              // Simplified: assume total view time accumulates
              this.elementImpressions.push({
                selector: el.id || el.dataset.track,
                firstViewedAtMs: viewTime,
                totalViewTimeMs: 0 // Update on disconnect or interval
              });
            }
          });
        }, { threshold: 0.5 });
        observer.observe(el);
      });
    }

    getSelector(el) {
      if (el.id) return `#${el.id}`;
      let sel = '';
      while (el && el !== document.body) {
        let id = el.id ? `#${el.id}` : '';
        if (id) return id;
        let cl = el.className ? `.${Array.from(el.classList).join('.')}` : '';
        if (cl) {
          sel = `${el.tagName.toLowerCase()}${cl}${sel}`;
          return sel;
        }
        sel = `${el.tagName.toLowerCase()} > ${sel}`;
        el = el.parentNode;
      }
      return sel;
    }

    updateActiveTime() {
      const update = () => {
        const now = Date.now();
        if (!document.hidden) {
          this.activeTime += (now - this.lastActiveTime) / 1000;
        }
        this.lastActiveTime = now;
      };
      document.addEventListener('visibilitychange', update);
      setInterval(update, 1000);
    }

    trackForm() {
      const form = document.getElementById('lead_gen_v2');
      if (!form) return;

      this.formData = {
        formId: 'lead_gen_v2',
        formStatus: 'abandoned',
        timeToFirstInteractionSec: null,
        totalTimeOnFormSec: 0,
        abandonmentField: null,
        fieldInteractions: []
      };

      const fields = form.querySelectorAll('input, textarea, select');
      let formFocusTimes = {};
      let lastFocusTime = null;

      form.addEventListener('focus', (e) => {
        const field = e.target;
        const fieldName = field.name || field.id;
        if (!this.timeToFirstInteraction && !document.hidden) {
          this.timeToFirstInteraction = (Date.now() - this.pageStartTime) / 1000;
        }
        formFocusTimes[fieldName] = Date.now();
        if (lastFocusTime) {
          const hesitation = Date.now() - lastFocusTime;
          // Add to previous field hesitation
        }
        lastFocusTime = Date.now();
      }, true);

      form.addEventListener('blur', (e) => {
        const field = e.target;
        const fieldName = field.name || field.id;
        if (formFocusTimes[fieldName]) {
          const timeSpent = Date.now() - formFocusTimes[fieldName];
          this.formData.totalTimeOnFormSec += timeSpent / 1000;
          const value = field.value || '';
          const interaction = {
            fieldName,
            timeSpentMs: timeSpent,
            hesitationMs: 0, // Calculate from previous
            correctionCount: 0, // Track input events
            refocusCount: 0, // Track focus count
            validationErrors: 0, // Track invalid
            value
          };
          this.formData.fieldInteractions.push(interaction);
          delete formFocusTimes[fieldName];
          this.formData.abandonmentField = fieldName;
        }
      }, true);

      // Simplified: increment corrections on input
      fields.forEach(field => {
        field.addEventListener('input', () => {
          // For email/phone, count changes or something
          const interaction = this.formData.fieldInteractions.find(f => f.fieldName === (field.name || field.id));
          if (interaction) interaction.correctionCount++;
        });
      });

      // On submit success, set status 'completed'
      form.addEventListener('submit', () => {
        this.formData.formStatus = 'completed';
      });
    }

    getFormAnalytics() {
      if (!this.formData) return null;
      this.formData.timeToFirstInteractionSec = this.timeToFirstInteraction || 0;
      // Sort fields alphabetically or as is
      this.formData.fieldInteractions.sort((a, b) => a.fieldName.localeCompare(b.fieldName));
      return this.formData;
    }

    trackErrors() {
      // JS Errors
      const originalOnError = window.onerror;
      window.onerror = (message, source, lineno, colno, error) => {
        this.jsErrors.push({
          message,
          stack: error?.stack || '',
          source,
          lineno,
          colno,
          context: 'global' // Or from current event
        });
        if (originalOnError) originalOnError.apply(this, arguments);
        return false;
      };

      // Unhandled Promise Rejections
      const originalOnRejection = window.onunhandledrejection;
      window.onunhandledrejection = (e) => {
        this.unhandledPromiseRejections.push({
          message: e.reason?.message || e.reason || 'Unhandled rejection'
        });
        if (originalOnRejection) originalOnRejection.apply(this, e);
      };

      // CSP Violations
      document.addEventListener('securitypolicyviolation', (e) => {
        this.cspViolations.push({
          blockedUri: e.blockedURI,
          violatedDirective: e.violatedDirective
        });
      });

      // Network Errors (simplified: monkey patch fetch)
      const originalFetch = window.fetch;
      window.fetch = (...args) => {
        return originalFetch(...args).catch(err => {
          this.networkErrors.push({
            url: args[0],
            statusCode: null, // Unknown on catch
            method: 'GET', // Default
            resourceType: 'fetch'
          });
          throw err;
        }).then(res => {
          if (!res.ok) {
            this.networkErrors.push({
              url: args[0],
              statusCode: res.status,
              method: args[1]?.method || 'GET',
              resourceType: 'fetch'
            });
          }
          return res;
        });
      };
    }

    getErrorInfo() {
      return {
        jsErrors: this.jsErrors.slice(0, 1), // Limit
        networkErrors: this.networkErrors.slice(0, 1),
        cspViolations: this.cspViolations.slice(0, 1),
        unhandledPromiseRejections: this.unhandledPromiseRejections.slice(0, 1)
      };
    }

    async compileData() {
      const locationInfo = await this.getLocationInfo();
      const deviceInfo = this.getDeviceInfo();
      const userInfo = this.getUserInfo();
      const sessionInfo = this.getSessionInfo();
      const pageInfo = this.getPageInfo();
      const performanceInfo = this.getPerformanceInfo();
      const interactionInfo = this.getInteractionInfo();
      const formAnalytics = this.getFormAnalytics();
      const errorInfo = this.getErrorInfo();

      const eventId = generateUUID(); // As in example format, but full UUID
      const timestamp = new Date().toISOString();

      return {
        tenantId: this.tenantId,
        eventInfo: {
          eventId,
          eventType: 'exit_intent',
          eventTrigger: 'user_exit_top',
          timestamp,
          eventPriority: 'medium'
        },
        userInfo,
        sessionInfo,
        pageInfo,
        deviceInfo,
        locationInfo,
        performanceInfo,
        interactionInfo,
        formAnalytics: formAnalytics || { formId: null, formStatus: null, timeToFirstInteractionSec: null, totalTimeOnFormSec: 0, abandonmentField: null, fieldInteractions: [] },
        errorInfo
      };
    }

    async triggerExitIntent() {
      if (this.exitIntentTriggered) {
        const data = await this.compileData();
        console.log(JSON.stringify(data, null, 2));
        // Submit to API
        try {
          const apiUrl = `https://api.smartdx.co/v1/track/${this.tenantId}`;
          await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        } catch (err) {
          console.error('Analytics submission failed:', err);
        }
      }
    }

    trackVisibility() {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.lastActiveTime = Date.now();
        }
      });
    }

    init() {
      // Already initialized in constructor; call trackers here if needed
    }
  }

  // Global init
  let tracker;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      tracker = new AnalyticsTracker();
    });
  } else {
    tracker = new AnalyticsTracker();
  }

  // Expose for manual trigger if needed
  window.AnalyticsTracker = { init: () => tracker?.init() };
})();