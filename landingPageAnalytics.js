/* landing-analytics.js
   Advanced landing page analytics collector.
   - Uses window._currentTenant._tenantId as tenantId
   - Generates other IDs as needed
   - Submits payload to API_ENDPOINT and logs to console
   - ONLY includes the keys specified by the user payload sample (no extras)
*/

(function () {
  'use strict';

  // ---------- CONFIG ----------
  const API_ENDPOINT = 'https://example.com/collect'; // <<--- set your API endpoint
  const GEO_IP_LOOKUP = 'https://ipapi.co/json/'; // public IP lookup; change if needed
  const PERSIST_KEY_PREFIX = '__lp_analytics__'; // prefix for localStorage keys
  const SESSION_TIMEOUT_MIN = 30; // minutes - session considered new after this idle
  const MOVEMENT_SAMPLING_MS = 500; // sample mouse movement every X ms

  // ---------- UTILITIES ----------
  function generateUUID() {
    // RFC4122 v4 compliant UUID (random)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> (c === 'x' ? 0 : 0);
      const v = c === 'x' ? (r % 16) : ((r & 0x3) | 0x8);
      return v.toString(16);
    });
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function msToHuman(ms) {
    // e.g., "14d 3h 12m"
    const totalMinutes = Math.floor(ms / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(' ');
  }

  function safeGetTenantId() {
    try {
      return (window && window._currentTenant && window._currentTenant._tenantId) || null;
    } catch (e) {
      return null;
    }
  }

  function storageKey(name) {
    const tenant = safeGetTenantId() || 'unknownTenant';
    return `${PERSIST_KEY_PREFIX}:${tenant}:${name}`;
  }

  function getLocal(key) {
    try {
      return localStorage.getItem(storageKey(key));
    } catch (e) {
      return null;
    }
  }

  function setLocal(key, value) {
    try {
      localStorage.setItem(storageKey(key), value);
    } catch (e) {
      // ignore quota issues
    }
  }

  function getSession(key) {
    try {
      return sessionStorage.getItem(storageKey(key));
    } catch (e) {
      return null;
    }
  }

  function setSession(key, value) {
    try {
      sessionStorage.setItem(storageKey(key), value);
    } catch (e) {}
  }

  // ---------- ID & Visit/session management ----------
  function getOrCreatePersistentAnonymousId() {
    let id = getLocal('persistentAnonymousId');
    if (!id) {
      id = generateUUID();
      setLocal('persistentAnonymousId', id);
      // also set firstVisitAt for timeSinceFirstVisit calculations
      setLocal('firstVisitAt', String(Date.now()));
    }
    return id;
  }

  function getOrCreateUserId() {
    // if you already have an authenticated user on the page, set window._lpUserId = 'usr_...' before script runs
    try {
      if (window && window._lpUserId) {
        return window._lpUserId;
      }
    } catch (e) {}
    let id = getLocal('userId');
    if (!id) {
      id = 'usr_' + generateUUID().slice(0, 8).toUpperCase();
      setLocal('userId', id);
    }
    return id;
  }

  function updateSessionInfo() {
    const now = Date.now();
    let sessionId = getSession('sessionId');
    let sessionStart = getSession('sessionStart'); // stored as timestamp string
    let lastSeen = getLocal('lastSeen'); // persisted to compute new sessions across tabs
    const lastSeenNum = lastSeen ? Number(lastSeen) : 0;
    const idleThresholdMs = SESSION_TIMEOUT_MIN * 60 * 1000;

    if (!sessionId || !sessionStart || (now - lastSeenNum) > idleThresholdMs) {
      // new session
      sessionId = generateUUID();
      sessionStart = String(now);
      setSession('sessionId', sessionId);
      setSession('sessionStart', sessionStart);

      // increment sessionCount
      let sc = Number(getLocal('sessionCount') || '0') + 1;
      setLocal('sessionCount', String(sc));
    }
    // update lastSeen
    setLocal('lastSeen', String(now));
    return {
      sessionId,
      sessionStart: Number(sessionStart),
      sessionCount: Number(getLocal('sessionCount') || '1'),
    };
  }

  // ---------- Interaction tracking ----------
  let pageEnterTs = Date.now();
  let activeStartTs = null; // when page becomes active
  let activeAccumMs = 0;
  let lastVisibilityChange = document.visibilityState;
  let pageMetrics = {
    timeOnPageSec: 0,
    activeTimeOnPageSec: 0,
    maxScrollPercent: 0,
    avgScrollVelocity: 0,
  };

  // scroll tracking for velocity
  let lastScrollY = window.scrollY || 0;
  let lastScrollT = Date.now();
  let scrollVelSamples = [];
  function onScroll() {
    const y = window.scrollY || 0;
    const t = Date.now();
    const dy = Math.abs(y - lastScrollY);
    const dt = Math.max(1, t - lastScrollT);
    const velocity = (dy / dt) * 1000; // px/sec
    scrollVelSamples.push(velocity);
    lastScrollY = y;
    lastScrollT = t;
    // max scroll %:
    const docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const winH = window.innerHeight || document.documentElement.clientHeight;
    const maxScrollPercent = docHeight > winH ? (y / (docHeight - winH)) * 100 : 0;
    if (maxScrollPercent > pageMetrics.maxScrollPercent) pageMetrics.maxScrollPercent = parseFloat(maxScrollPercent.toFixed(2));
    // record scrollPath for heatmap (sample)
    recordScrollPath(y);
  }

  // heatmap-like collections
  const movementPath = [];
  const clicks = [];
  const scrollPath = [];
  function recordMovement(e) {
    movementLatest = { x: e.clientX, y: e.clientY, t: Date.now() - pageEnterTs };
  }

  let movementLatest = null;
  function sampleMovement() {
    if (movementLatest) {
      movementPath.push(Object.assign({}, movementLatest));
    }
  }

  function recordClick(e) {
    try {
      const el = e.target;
      const selector = uniqueSelector(el);
      const text = (el && el.innerText) ? String(el.innerText).trim().slice(0, 200) : '';
      clicks.push({
        x: e.clientX,
        y: e.clientY,
        t: Date.now() - pageEnterTs,
        button: e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle',
        elementSelector: selector,
        elementText: text,
        isDeadClick: false,
        isRageClick: false
      });
    } catch (err) {
      // silent
    }
  }

  function recordScrollPath(scrollY) {
    scrollPath.push({ scrollY: Math.round(scrollY), t: Date.now() - pageEnterTs });
  }

  // minimal unique selector generator (keeps it concise)
  function uniqueSelector(el) {
    if (!el || !el.nodeName) return '';
    try {
      if (el.id) return `#${el.id}`;
      const parts = [];
      let node = el;
      let depth = 0;
      while (node && node.nodeType === 1 && depth < 5) {
        let part = node.nodeName.toLowerCase();
        if (node.className && typeof node.className === 'string') {
          const cls = node.className.trim().split(/\s+/)[0];
          if (cls) part += `.${cls}`;
        }
        parts.unshift(part);
        node = node.parentElement;
        depth++;
      }
      return parts.join(' > ');
    } catch (e) {
      return '';
    }
  }

  // exit intent detection
  let exitIntent = {
    triggered: false,
    delayMs: null,
    position: null,
    movementType: null
  };

  function onMouseLeave(e) {
    // only consider near top exits
    if (e.clientY <= 20 && !exitIntent.triggered) {
      exitIntent.triggered = true;
      exitIntent.delayMs = Date.now() - pageEnterTs;
      exitIntent.position = { x: e.clientX, y: e.clientY };
      exitIntent.movementType = 'top_exit';
      // send immediately for exit-intent event
      scheduleSend('exit_intent');
    }
  }

  // form analytics (captures only keys present in payload)
  const formAnalytics = {
    formId: null,
    formStatus: null,
    timeToFirstInteractionSec: null,
    totalTimeOnFormSec: null,
    abandonmentField: null,
    fieldInteractions: []
  };

  function attachFormTracking() {
    const forms = document.querySelectorAll('form');
    if (!forms || !forms.length) return;
    forms.forEach(form => {
      const fid = form.id || form.getAttribute('name') || generateUUID().slice(0, 8);
      let firstInteractionAt = null;
      let formEnterAt = Date.now();
      const fieldMap = new Map();

      form.addEventListener('focusin', (ev) => {
        if (!firstInteractionAt) {
          firstInteractionAt = Date.now();
          formAnalytics.timeToFirstInteractionSec = parseFloat(((firstInteractionAt - formEnterAt) / 1000).toFixed(2));
        }
        const field = ev.target;
        if (field && field.name) {
          if (!fieldMap.has(field.name)) {
            fieldMap.set(field.name, { fieldName: field.name, timeSpentMs: 0, hesitationMs: 0, correctionCount: 0, refocusCount: 0, validationErrors: 0, value: '' , lastFocusAt: Date.now()});
          }
        }
      });

      form.addEventListener('input', (ev) => {
        const field = ev.target;
        if (field && field.name && fieldMap.has(field.name)) {
          const rec = fieldMap.get(field.name);
          rec.value = String(field.value || '').slice(0, 200);
        }
      });

      form.addEventListener('blur', (ev) => {
        const field = ev.target;
        if (field && field.name && fieldMap.has(field.name)) {
          const rec = fieldMap.get(field.name);
          const last = rec.lastFocusAt || formEnterAt;
          rec.timeSpentMs += Date.now() - last;
          rec.lastFocusAt = null;
        }
      });

      // simplistic abandonment detection
      form.addEventListener('submit', (ev) => {
        formAnalytics.formId = fid;
        formAnalytics.formStatus = 'submitted';
        formAnalytics.totalTimeOnFormSec = parseFloat(((Date.now() - (firstInteractionAt || formEnterAt)) / 1000).toFixed(2));
        // copy fieldMap to formAnalytics.fieldInteractions
        formAnalytics.fieldInteractions = Array.from(fieldMap.values()).map(v => ({
          fieldName: v.fieldName,
          timeSpentMs: v.timeSpentMs,
          hesitationMs: v.hesitationMs,
          correctionCount: v.correctionCount,
          refocusCount: v.refocusCount,
          validationErrors: v.validationErrors,
          value: v.value
        }));
      });

      // detect abandonment if user navigates away and form had interactions
      window.addEventListener('beforeunload', () => {
        if (formAnalytics.formStatus !== 'submitted' && (fieldMap.size > 0 || firstInteractionAt)) {
          formAnalytics.formId = fid;
          formAnalytics.formStatus = 'abandoned';
          formAnalytics.totalTimeOnFormSec = parseFloat(((Date.now() - (firstInteractionAt || formEnterAt)) / 1000).toFixed(2));
          // find a likely abandonment field (first empty field or last interacted)
          let abandonmentField = null;
          for (const [name, v] of fieldMap.entries()) {
            if (!v.value) {
              abandonmentField = name; break;
            }
            abandonmentField = name;
          }
          formAnalytics.abandonmentField = abandonmentField;
          formAnalytics.fieldInteractions = Array.from(fieldMap.values()).map(v => ({
            fieldName: v.fieldName,
            timeSpentMs: v.timeSpentMs,
            hesitationMs: v.hesitationMs,
            correctionCount: v.correctionCount,
            refocusCount: v.refocusCount,
            validationErrors: v.validationErrors,
            value: v.value
          }));
        }
      });
    });
  }

  // error info collection
  const errorInfo = {
    jsErrors: [],
    networkErrors: [],
    cspViolations: [],
    unhandledPromiseRejections: []
  };

  window.addEventListener('error', function (ev) {
    try {
      const err = ev.error || {};
      errorInfo.jsErrors.push({
        message: err && err.message ? String(err.message) : (ev.message || ''),
        stack: err && err.stack ? String(err.stack).slice(0, 2000) : '',
        source: ev.filename || (ev.filename || ''),
        lineno: ev.lineno || ev.lineno === 0 ? ev.lineno : null,
        colno: ev.colno || null,
        context: ev.type || ''
      });
    } catch (e) {}
  });

  window.addEventListener('unhandledrejection', function (ev) {
    try {
      errorInfo.unhandledPromiseRejections.push({
        message: ev.reason && ev.reason.message ? String(ev.reason.message) : String(ev.reason || ''),
      });
    } catch (e) {}
  });

  window.addEventListener('securitypolicyviolation', function (ev) {
    try {
      errorInfo.cspViolations.push({
        blockedUri: ev.blockedURI || ev.blockedURI === 0 ? ev.blockedURI : '',
        violatedDirective: ev.violatedDirective || ''
      });
    } catch (e) {}
  });

  // network errors: intercept fetch and XHR (partial)
  (function interceptFetch() {
    if (!window.fetch) return;
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      const start = Date.now();
      return originalFetch.apply(this, args).then((res) => {
        if (!res.ok) {
          errorInfo.networkErrors.push({
            url: (res && res.url) ? res.url : (args && args[0]) ? String(args[0]) : '',
            statusCode: res.status || null,
            method: (args && args[1] && args[1].method) ? args[1].method : 'GET',
            resourceType: 'fetch'
          });
        }
        return res;
      }).catch((err) => {
        errorInfo.networkErrors.push({
          url: (args && args[0]) ? String(args[0]) : '',
          statusCode: null,
          method: (args && args[1] && args[1].method) ? args[1].method : 'GET',
          resourceType: 'fetch'
        });
        throw err;
      });
    };
  })();

  // ---------- Performance (Core Web Vitals + timings) ----------
  const performanceInfo = {
    coreWebVitals: {
      lcp: { value: null, elementSelector: null },
      cls: { value: 0, sources: [] },
      inp: { value: null, elementSelector: null }
    },
    navigationTiming: {
      pageLoadTimeSec: null,
      requestSec: null,
      responseSec: null
    },
    resourceTiming: {
      slowResources: [],
      failedResources: []
    }
  };

  // LCP/CLS/INP observers
  (function observeVitals() {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      // LCP
      try {
        const po = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const last = entries[entries.length - 1];
          if (last) {
            performanceInfo.coreWebVitals.lcp.value = parseFloat((last.renderTime || last.loadTime || last.startTime) ? ((last.renderTime || last.loadTime || last.startTime) / 1000).toFixed(3) : null);
            // approximate element selector
            if (last.element) {
              performanceInfo.coreWebVitals.lcp.elementSelector = uniqueSelector(last.element);
            }
          }
        });
        po.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {}

      // CLS
      try {
        let clsValue = 0;
        const clsSources = [];
        const poCls = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              if (entry.sources && entry.sources.length) {
                for (const s of entry.sources) {
                  clsSources.push({
                    selector: s.node ? uniqueSelector(s.node) : '',
                    shiftAmount: parseFloat((s.value || 0).toFixed(3))
                  });
                }
              }
            }
          }
          performanceInfo.coreWebVitals.cls.value = parseFloat(clsValue.toFixed(3));
          performanceInfo.coreWebVitals.cls.sources = clsSources;
        });
        poCls.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {}

      // INP (use first-input-delay approximation or input events)
      try {
        const poInp = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // use processingStart - startTime where available
            const val = (entry.processingStart && entry.startTime) ? (entry.processingStart - entry.startTime) / 1000 : entry.duration ? entry.duration / 1000 : null;
            performanceInfo.coreWebVitals.inp.value = val !== null ? parseFloat(val.toFixed(3)) : performanceInfo.coreWebVitals.inp.value;
            if (entry.target) performanceInfo.coreWebVitals.inp.elementSelector = uniqueSelector(entry.target);
          }
        });
        poInp.observe({ type: 'interaction', buffered: true });
      } catch (e) {}
    } catch (e) {
      // ignore
    }
  })();

  // navigation timing & resource timing
  function collectTiming() {
    try {
      if (performance && performance.timing && performance.getEntriesByType) {
        // NavigationTiming modern
        const navEntries = performance.getEntriesByType('navigation');
        if (navEntries && navEntries.length) {
          const n = navEntries[0];
          performanceInfo.navigationTiming.pageLoadTimeSec = parseFloat(((n.loadEventEnd - n.startTime) / 1000).toFixed(3));
          performanceInfo.navigationTiming.requestSec = parseFloat(((n.responseStart - n.requestStart) / 1000).toFixed(3));
          performanceInfo.navigationTiming.responseSec = parseFloat(((n.responseEnd - n.responseStart) / 1000).toFixed(3));
        } else if (performance.timing) {
          const t = performance.timing;
          performanceInfo.navigationTiming.pageLoadTimeSec = parseFloat(((t.loadEventEnd - t.navigationStart) / 1000).toFixed(3));
          performanceInfo.navigationTiming.requestSec = parseFloat(((t.responseStart - t.requestStart) / 1000).toFixed(3));
          performanceInfo.navigationTiming.responseSec = parseFloat(((t.responseEnd - t.responseStart) / 1000).toFixed(3));
        }

        // resource timing
        const resources = performance.getEntriesByType('resource') || [];
        const slowResources = [];
        const failedResources = [];
        resources.forEach(r => {
          const dur = r.duration || 0;
          if (dur > 2000) {
            slowResources.push({
              name: r.name || '',
              type: r.initiatorType || '',
              durationMs: Math.round(dur)
            });
          }
        });
        // failed resources are not always clear via resource timing status codes, so we check the DOM for failed images/scripts
        const imgs = Array.from(document.querySelectorAll('img'));
        imgs.forEach(img => {
          if (img.complete && img.naturalWidth === 0) {
            failedResources.push({
              name: img.currentSrc || img.src || '',
              type: 'img',
              statusCode: 404
            });
          }
        });

        performanceInfo.resourceTiming.slowResources = slowResources;
        performanceInfo.resourceTiming.failedResources = failedResources;
      }
    } catch (e) {}
  }

  // ---------- Device & Page Info ----------
  function detectDevice() {
    const ua = navigator.userAgent || '';
    let os = 'Unknown';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'Mac';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    const browser = (function () {
      if (/chrome\/\d+/i.test(ua) && !/edg\//i.test(ua)) return 'Google Chrome';
      if (/firefox\/\d+/i.test(ua)) return 'Firefox';
      if (/safari\/\d+/i.test(ua) && !/chrome\/\d+/i.test(ua)) return 'Safari';
      if (/edg\//i.test(ua)) return 'Edge';
      return 'Unknown';
    })();

    const type = (function () {
      const w = Math.max(window.screen.width, window.innerWidth || 0);
      if (w <= 480) return 'mobile';
      if (w <= 1024) return 'tablet';
      return 'desktop';
    })();

    return {
      timezone: (Intl && Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions) ? Intl.DateTimeFormat().resolvedOptions().timeZone || null : null,
      type,
      os,
      browser,
      userAgent: ua,
      capabilities: {}
    };
  }

  function collectPageInfo() {
    return {
      url: location.href,
      path: location.pathname,
      hash: location.hash || '',
      search: location.search || '',
      title: document.title || '',
      pageId: (document.documentElement && document.documentElement.getAttribute('data-page-id')) || null,
      canonicalUrl: (function () {
        const el = document.querySelector("link[rel='canonical']");
        return el ? el.href : location.origin + location.pathname;
      })(),
      language: navigator.language || navigator.userLanguage || null,
      isIframe: window.self !== window.top
    };
  }

  // ---------- Location/IP ----------
  async function fetchGeoIp() {
    try {
      const res = await fetch(GEO_IP_LOOKUP, { cache: 'no-cache' });
      if (!res.ok) throw new Error('geo lookup failed');
      const data = await res.json();
      return {
        ip: data.ip || null,
        countryCode: data.country || null,
        regionName: data.region || null,
        city: data.city || null,
        lat: data.latitude || (data.lat || null),
        lon: data.longitude || (data.lon || null)
      };
    } catch (e) {
      return {
        ip: null,
        countryCode: null,
        regionName: null,
        city: null,
        lat: null,
        lon: null
      };
    }
  }

  // ---------- Compose payload (strict keys only) ----------
  async function composePayload(triggerEventType = 'auto') {
    const tenantId = safeGetTenantId();
    const eventId = generateUUID();
    const eventTimestamp = nowISO();
    // update session infos
    const sessionData = updateSessionInfo();
    // compute times
    const timeSinceFirstVisitMs = (Date.now() - Number(getLocal('firstVisitAt') || Date.now()));
    const timeSinceLastVisitMs = Date.now() - Number(getLocal('lastSeen') || Date.now());
    const sessionStartISO = new Date(sessionData.sessionStart).toISOString();
    // page metrics finalize
    pageMetrics.timeOnPageSec = parseFloat(((Date.now() - pageEnterTs) / 1000).toFixed(2));
    pageMetrics.activeTimeOnPageSec = parseFloat(((activeAccumMs + (activeStartTs ? (Date.now() - activeStartTs) : 0)) / 1000).toFixed(2));
    pageMetrics.avgScrollVelocity = scrollVelSamples.length ? parseFloat((scrollVelSamples.reduce((a,b)=>a+b,0)/scrollVelSamples.length).toFixed(1)) : 0;

    // collect performance snapshots
    collectTiming();

    // attempt geo lookup
    const geo = await fetchGeoIp();

    // build the payload using only keys specified in user's structure
    const payload = {
      tenantId: tenantId,
      eventInfo: {
        eventId: eventId,
        eventType: triggerEventType === 'exit_intent' ? 'exit_intent' : triggerEventType,
        eventTrigger: triggerEventType === 'exit_intent' ? 'user_exit_top' : triggerEventType,
        timestamp: eventTimestamp,
        eventPriority: 'medium'
      },
      userInfo: {
        userId: getOrCreateUserId(),
        persistentAnonymousId: getOrCreatePersistentAnonymousId(),
        sessionCount: sessionData.sessionCount,
        timeSinceFirstVisit: msToHuman(timeSinceFirstVisitMs),
        timeSinceLastVisit: msToHuman(timeSinceLastVisitMs)
      },
      sessionInfo: {
        sessionId: sessionData.sessionId,
        sessionStartTime: sessionStartISO,
        sessionDurationSec: Math.round((Date.now() - sessionData.sessionStart) / 1000),
        activeDurationSec: Math.round(activeAccumMs / 1000),
        isEngaged: pageMetrics.activeTimeOnPageSec >= 10, // arbitrary industry-like threshold
        isBounce: pageMetrics.timeOnPageSec < 5 && pageMetrics.pageViewsInSession === undefined ? true : false,
        pageViewsInSession: Number(getSession('pageViews') || 1),
        eventsInSession: Number(getSession('eventsInSession') || 0),
        source: {
          channel: (document.referrer && document.referrer.indexOf('facebook.com') !== -1) ? 'Facebook' : (new URLSearchParams(location.search).get('utm_source') || null),
          referrerUrl: document.referrer || null,
          landingUrl: location.href || null,
          firstReferrer: getLocal('firstReferrer') || document.referrer || null,
          utmParams: {
            source: new URLSearchParams(location.search).get('utm_source') || null,
            medium: new URLSearchParams(location.search).get('utm_medium') || null,
            campaign: new URLSearchParams(location.search).get('utm_campaign') || null,
            term: new URLSearchParams(location.search).get('utm_term') || null,
            content: new URLSearchParams(location.search).get('utm_content') || null
          },
          gclid: new URLSearchParams(location.search).get('gclid') || null
        }
      },
      pageInfo: collectPageInfo(),
      deviceInfo: detectDevice(),
      locationInfo: {
        ip: geo.ip,
        countryCode: geo.countryCode,
        regionName: geo.regionName,
        city: geo.city,
        lat: geo.lat,
        lon: geo.lon
      },
      performanceInfo: performanceInfo,
      interactionInfo: {
        pageMetrics: {
          timeOnPageSec: pageMetrics.timeOnPageSec,
          activeTimeOnPageSec: pageMetrics.activeTimeOnPageSec,
          maxScrollPercent: pageMetrics.maxScrollPercent,
          avgScrollVelocity: pageMetrics.avgScrollVelocity
        },
        heatmap: {
          movementPath: movementPath.slice(-200), // keep only recent 200 samples
          clicks: clicks.slice(-200),
          scrollPath: scrollPath.slice(-200),
          exitIntent: {
            triggered: !!exitIntent.triggered,
            delayMs: exitIntent.delayMs,
            position: exitIntent.position,
            movementType: exitIntent.movementType
          }
        },
        frustrationSignals: {
          rageClickCount: clicks.filter(c => c.isRageClick).length,
          deadClickCount: clicks.filter(c => c.isDeadClick).length,
          errorClickCount: 0,
          franticScrolls: 0
        },
        elementImpressions: (function () {
          const impressions = [];
          const el = document.querySelector('#pricing-table');
          if (el) {
            impressions.push({
              selector: '#pricing-table',
              firstViewedAtMs: 0,
              totalViewTimeMs: 0
            });
          }
          return impressions;
        })(),
        keyboardInteractions: {
          tabPressCount: Number(getSession('tabPressCount') || 0),
          copyPasteEvents: [] // collected only if you attach listeners; left empty otherwise
        }
      },
      formAnalytics: formAnalytics,
      errorInfo: errorInfo
    };

    // Make sure we strictly do not add any extra keys.
    // All optional values which may be undefined should be explicitly null if not available
    // (we left some fields as null where appropriate above).

    return payload;
  }

  // ---------- Send / Log ----------
  async function sendPayload(payload) {
    try {
      // console.log the payload
      console.log('[LandingAnalytics] payload:', payload);

      // POST to API endpoint as JSON
      const body = JSON.stringify(payload);
      // Use sendBeacon when possible for unload safety
      if (navigator.sendBeacon && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(API_ENDPOINT, blob);
        // also attempt fetch in background (non-blocking)
        try {
          await fetch(API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
        } catch (e) {}
      } else {
        // fallback fetch
        await fetch(API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
      }
    } catch (e) {
      // if submission fails, still logged to console above
      console.warn('[LandingAnalytics] send failed', e);
    }
  }

  // ---------- Scheduling and triggers ----------
  let sendScheduled = false;
  function scheduleSend(trigger = 'auto') {
    if (sendScheduled) return;
    sendScheduled = true;
    // compose then send (compose is async because geo ip lookup)
    (async function () {
      const payload = await composePayload(trigger);
      // Send and don't await to avoid blocking if called on exit
      sendPayload(payload);
    })();
  }

  // send when page unloads (best-effort)
  window.addEventListener('beforeunload', function () {
    scheduleSend('page_unload');
  });

  // also a fallback after X seconds (in case no exit-intent)
  setTimeout(() => scheduleSend('timed_send'), 30000);

  // ---------- Initialization ----------
  function init() {
    // attach listeners for interaction metrics
    document.addEventListener('mousemove', recordMovement, { passive: true });
    document.addEventListener('click', recordClick, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        activeStartTs = Date.now();
      } else {
        if (activeStartTs) {
          activeAccumMs += Date.now() - activeStartTs;
          activeStartTs = null;
        }
      }
    });

    // start active timer if visible
    if (document.visibilityState === 'visible') activeStartTs = Date.now();

    // sample movement periodically
    setInterval(sampleMovement, MOVEMENT_SAMPLING_MS);

    // attach exit-intent detection
    document.addEventListener('mouseleave', onMouseLeave);

    // attach form tracking
    attachFormTracking();

    // simple keyboard tracking for tab presses
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        const count = Number(getSession('tabPressCount') || 0) + 1;
        setSession('tabPressCount', String(count));
      }
    });

    // increment pageViews in session
    try {
      const pv = Number(getSession('pageViews') || 0) + 1;
      setSession('pageViews', String(pv));
    } catch (e) {}

    // initial session update
    updateSessionInfo();

    // warm collect of performance after load
    window.addEventListener('load', function () {
      setTimeout(() => {
        collectTiming();
      }, 1000);
    });
  }

  // run init
  init();

  // expose API for manual triggering if desired (but do NOT add extra keys anywhere)
  window.LandingAnalytics = {
    triggerNow: () => scheduleSend('manual'),
    getPayloadSnapshot: async () => await composePayload('snapshot')
  };

})();
