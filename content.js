(function () {
  'use strict';

  // Matches /p/:post_id or /reel(s)/:post_id with optional trailing slash
  const POST_URL_REGEX = /^\/(?:p|reels?)\/([a-zA-Z0-9_-]+)\/?$/;

  /**
   * Attempts to extract the username of the post author from the DOM.
   */
  function extractUsername(postId) {
    let container = document.querySelector('div[role="dialog"]');

    if (!container && postId) {
      const postLink = document.querySelector(
        `a[href*="/p/${postId}"], a[href*="/reel/${postId}"], a[href*="/reels/${postId}"]`
      );
      if (postLink) {
        container = postLink.closest('article, [role="dialog"]');
      }
    }

    if (!container) {
      const articles = document.querySelectorAll('article');
      if (articles.length === 1) {
        container = articles[0];
      } else if (articles.length === 0) {
        container = document.querySelector('main, [role="main"]');
      }
    }

    if (!container) return null;

    const excluded = ['explore', 'reels', 'reel', 'stories', 'direct', 'p', 'audio'];

    // Extract author's profile link from the post <header>
    const header = container.querySelector('header');
    if (header) {
      const links = header.querySelectorAll('a[role="link"], a[href^="/"]');
      for (const link of links) {
        const href = link.getAttribute('href');
        const match = href && href.match(/^\/([a-zA-Z0-9._]+)\/?$/);
        if (match && !excluded.includes(match[1])) {
          return match[1];
        }
      }
    }

    // Fallback: Search for any profile link near the top of the container
    const fallbackLinks = container.querySelectorAll('a[href^="/"]');
    for (const link of fallbackLinks) {
      const href = link.getAttribute('href');
      const match = href && href.match(/^\/([a-zA-Z0-9._]+)\/?$/);
      if (match && !excluded.includes(match[1])) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Observes the DOM until the post header mounts and the username is found.
   */
  function waitForUsernameAndReplace(postId) {
    const initialUser = extractUsername(postId);
    if (initialUser) {
      silentlyUpdateUrl(initialUser, postId);
      return;
    }

    const observer = new MutationObserver((_, obs) => {
      const currentMatch = window.location.pathname.match(POST_URL_REGEX);
      if (!currentMatch || currentMatch[1] !== postId) {
        obs.disconnect();
        return;
      }

      const username = extractUsername(postId);
      if (username) {
        obs.disconnect();
        silentlyUpdateUrl(username, postId);
      }
    });

    // Fallback to documentElement if document.body isn't parsed yet (document_start)
    const targetNode = document.body || document.documentElement;
    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        subtree: true,
      });
    }

    // Timeout safety net (stop observing after 8 seconds)
    setTimeout(() => observer.disconnect(), 8000);
  }

  /**
   * Silently updates the URL in the address bar without reloading.
   */
  function silentlyUpdateUrl(userId, postId) {
    const currentParams = window.location.search;
    const currentHash = window.location.hash;
    const newPath = `/${userId}/p/${postId}/${currentParams}${currentHash}`;

    if (window.location.pathname !== `/${userId}/p/${postId}/`) {
      originalReplaceState.call(window.history, window.history.state, '', newPath);
    }
  }

  /**
   * Inspects the current URL and triggers extraction if on a /p/:post_id or /reel(s)/:post_id page.
   */
  function checkUrl() {
    const match = window.location.pathname.match(POST_URL_REGEX);
    if (match) {
      const postId = match[1];
      waitForUsernameAndReplace(postId);
    }
  }

  // --- Hooking SPA Navigation ---

  window.addEventListener('popstate', checkUrl);

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    checkUrl();
    return result;
  };

  history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    checkUrl();
    return result;
  };

  if ('navigation' in window) {
    window.navigation.addEventListener('navigatesuccess', checkUrl);
  }

  // Initial check on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkUrl, { once: true });
  } else {
    checkUrl();
  }
})();
