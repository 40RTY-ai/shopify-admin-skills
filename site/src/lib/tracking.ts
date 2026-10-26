/**
 * GTM + dataLayer tracking for skills.40rty.ai (tracking spec v1.0, section 1.3).
 *
 * CONSENT_DEFAULT_JS, ATTRIBUTION_JS and gtmLoaderJs are copied verbatim from
 * 40RTY-ai/40RTY-website lib/tracking/snippets.ts so all 40rty sites share one
 * _40_attr cookie and the same behaviour; keep them in sync (see that repo's
 * tracking/README.md). GA4, Google Ads, LinkedIn and X all load through GTM.
 */

export const GTM_ID = 'GTM-N4NZ8S4W'

/** Consent Mode v2 defaults (spec 2.1). */
export const CONSENT_DEFAULT_JS = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted',personalization_storage:'denied',wait_for_update:500,region:['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH']});
gtag('consent','default',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted',functionality_storage:'granted',security_storage:'granted',personalization_storage:'granted'});
gtag('set','ads_data_redaction',true);gtag('set','url_passthrough',true);
window.__40_consent_ok=true;`

/** attribution.js (spec 4.2). */
export const ATTRIBUTION_JS = `/*! 40rty attribution v1 */
(function (w, d) {
  'use strict';
  var KEY = '_40_attr', DAYS = 90;
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var CLICK = ['gclid', 'gbraid', 'wbraid', 'li_fat_id', 'twclid'];
  var INTERNAL_SOURCES = /^(40rty\\.ai|www\\.40rty\\.ai|audit\\.40rty\\.ai|skills\\.40rty\\.ai|catalog)$/i;
  var LISTING_RE = /^https?:\\/\\/apps\\.shopify\\.com\\/fourty-ai/i;
  var OUR_HOSTS = /(^|\\.)(40rty\\.ai|agentiq\\.report)$/i;

  function cookieDomain() {
    var h = location.hostname;
    if (/(^|\\.)40rty\\.ai$/i.test(h)) return '; Domain=.40rty.ai';
    if (/(^|\\.)agentiq\\.report$/i.test(h)) return '; Domain=.agentiq.report';
    return '';
  }
  function canPersist() { return w.__40_consent_ok !== false; }
  function readCookie(n) {
    var m = d.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function load() {
    var raw = null;
    try { raw = readCookie(KEY) || w.localStorage.getItem(KEY) || w.sessionStorage.getItem(KEY); } catch (e) {}
    if (!raw) return null;
    try { var o = JSON.parse(raw); return (o && o.exp > Date.now()) ? o : null; } catch (e) { return null; }
  }
  function save(o) {
    o.exp = Date.now() + DAYS * 864e5;
    var s = JSON.stringify(o);
    if (!canPersist()) { try { w.sessionStorage.setItem(KEY, s); } catch (e) {} return; }
    d.cookie = KEY + '=' + encodeURIComponent(s) + '; Max-Age=' + (DAYS * 86400) +
      '; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '') + cookieDomain();
    try { w.localStorage.setItem(KEY, s); w.sessionStorage.removeItem(KEY); } catch (e) {}
  }
  function gaClientId() {
    var c = readCookie('_ga'); if (!c) return null;
    var p = c.split('.'); return p.length >= 4 ? p[2] + '.' + p[3] : null;
  }
  function refHost() {
    try { var h = new URL(d.referrer).hostname; return OUR_HOSTS.test(h) ? null : h; } catch (e) { return null; }
  }

  var q = new URLSearchParams(location.search), touch = {}, hasUtm = false, hasClick = false;
  UTM.forEach(function (k) { var v = q.get(k); if (v) { touch[k] = v.slice(0, 150).toLowerCase(); hasUtm = true; } });
  CLICK.forEach(function (k) { var v = q.get(k); if (v) { touch[k] = v.slice(0, 500); hasClick = true; } });
  if (hasUtm && !hasClick && INTERNAL_SOURCES.test(touch.utm_source || '')) { hasUtm = false; touch = {}; }
  if (!touch.utm_source && hasClick) {
    if (touch.gclid || touch.gbraid || touch.wbraid) { touch.utm_source = 'google'; touch.utm_medium = 'cpc'; }
    else if (touch.li_fat_id) { touch.utm_source = 'linkedin'; touch.utm_medium = 'paid_social'; }
    else if (touch.twclid) { touch.utm_source = 'x'; touch.utm_medium = 'paid_social'; }
  }
  var stored = load() || {};
  var now = new Date().toISOString(), landing = location.hostname + location.pathname;
  if (hasUtm || hasClick) {
    touch.ts = now; touch.landing_page = landing;
    if (!stored.first) stored.first = touch;
    stored.last = touch;
    save(stored);
  } else if (!stored.first) {
    var r = refHost();
    stored.first = stored.last = { utm_source: r || '(direct)', utm_medium: r ? 'referral' : '(none)', ts: now, landing_page: landing };
    save(stored);
  } else if (canPersist() && !readCookie(KEY)) {
    save(stored);
  }

  function toParams() {
    var a = load() || stored, l = a.last || {}, f = a.first || {}, o = {};
    UTM.forEach(function (k) { if (l[k]) o['attr_' + k] = l[k]; if (f[k]) o['first_' + k] = f[k]; });
    o.attr_click_id_type = l.gclid ? 'gclid' : l.gbraid ? 'gbraid' : l.wbraid ? 'wbraid' :
      l.li_fat_id ? 'li_fat_id' : l.twclid ? 'twclid' : 'none';
    if (l.landing_page) o.attr_landing_page = l.landing_page;
    return o;
  }
  function formFields() {
    var a = load() || stored;
    return { attribution: { first: a.first || null, last: a.last || null, ga_client_id: gaClientId(),
      page: location.href, captured_at: new Date().toISOString() } };
  }
  function decorateListingUrl(href, ctaLocation) {
    var u = new URL(href, location.href), l = (load() || stored).last || {};
    var paid = l.utm_source && l.utm_source !== '(direct)' && l.utm_medium !== 'referral';
    UTM.forEach(function (k) { u.searchParams.delete(k); });
    if (paid) {
      UTM.forEach(function (k) { if (l[k]) u.searchParams.set(k, l[k]); });
      if (l.gclid) u.searchParams.set('gclid', l.gclid);
    } else {
      u.searchParams.set('utm_source', location.hostname.replace(/^www\\./, ''));
      u.searchParams.set('utm_medium', ctaLocation || 'website');
      u.searchParams.set('utm_campaign', 'install_shopify');
    }
    return u.toString();
  }
  w.fortyAttribution = { get: load, toParams: toParams, formFields: formFields,
    decorateListingUrl: decorateListingUrl, gaClientId: gaClientId };

  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push(toParams());

  d.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || !LISTING_RE.test(a.href)) return;
    var loc = a.getAttribute('data-cta-location') || 'unknown';
    var dest = decorateListingUrl(a.href, loc);
    a.href = dest;
    var ev = { event: 'shopify_app_install_click', cta_text: (a.innerText || '').replace(/[\u2192\u2197]/g, '').replace(/\\s+/g, ' ').trim().slice(0, 100),
      cta_location: loc, destination: dest, link_domain: 'apps.shopify.com',
      event_id: (w.crypto && w.crypto.randomUUID) ? w.crypto.randomUUID() : (Date.now() + '-' + Math.random()) };
    var p = toParams(); for (var k in p) { ev[k] = p[k]; }
    w.dataLayer.push(ev);
    if (w.__40_legacy_gtag) w.__40_legacy_gtag(ev);
  }, true);
})(window, document);`

/** GTM loader (spec 1.3). */
export function gtmLoaderJs(id: string): string {
  return `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(id)});`
}

/**
 * Page-level helpers for the inline scripts on this static site (spec 3.2):
 * window.fortyTrack(event, params) pushes to the dataLayer like track() in the
 * Next.js apps (resets event-scoped keys, adds attr_* and an event_id for
 * conversions); window.fortyHashEmail(email) resolves to { user_data } with a
 * SHA-256 of the email, never the email itself.
 */
export const TRACK_JS = `(function (w) {
  var CONVERSIONS = { audit_completed: 1, audit_email_captured: 1, generate_lead: 1, shopify_app_install_click: 1, form_submit: 1 };
  var RESET = ['cta_text','cta_location','cta_type','destination','form_id','form_name','form_location','lead_type','value','currency','event_id','user_data','method'];
  function uuid() { return (w.crypto && w.crypto.randomUUID) ? w.crypto.randomUUID() : Date.now() + '-' + Math.random(); }
  w.fortyTrack = function (event, params) {
    try {
      w.dataLayer = w.dataLayer || [];
      var reset = {}; RESET.forEach(function (k) { reset[k] = undefined; }); w.dataLayer.push(reset);
      var p = (w.fortyAttribution && w.fortyAttribution.toParams) ? w.fortyAttribution.toParams() : {};
      for (var k in (params || {})) p[k] = params[k];
      p.event = event;
      if (CONVERSIONS[event] && !p.event_id) p.event_id = uuid();
      w.dataLayer.push(p);
    } catch (e) {}
  };
  w.fortyHashEmail = function (email) {
    try {
      var data = new TextEncoder().encode(String(email).trim().toLowerCase());
      return w.crypto.subtle.digest('SHA-256', data).then(function (buf) {
        var hex = Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
        return { user_data: { sha256_email_address: hex } };
      }).catch(function () { return {}; });
    } catch (e) { return Promise.resolve({}); }
  };
  /** Lead events for a successful skills signup (spec 3.4). */
  w.fortyTrackSkillsSignup = function (email, formLocation) {
    w.fortyHashEmail(email).then(function (userData) {
      var lead = { lead_type: 'skills_signup', form_id: 'skills_signup', value: 5, currency: 'USD' };
      for (var k in userData) lead[k] = userData[k];
      w.fortyTrack('skills_signup', { method: 'email' });
      w.fortyTrack('generate_lead', lead);
      w.fortyTrack('form_submit', { form_id: 'skills_signup', form_name: 'Skills signup', form_location: formLocation, lead_type: 'skills_signup' });
    });
  };
})(window);`
