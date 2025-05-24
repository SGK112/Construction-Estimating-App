/**
 * Mobile Responsiveness Module
 * 
 * This module provides mobile responsiveness and accessibility features for the
 * Construction Estimator app, ensuring a seamless experience across all devices.
 */

class ResponsivenessManager {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.breakpoints = options.breakpoints || {
      xs: 0,    // Extra small devices
      sm: 576,  // Small devices
      md: 768,  // Medium devices
      lg: 992,  // Large devices
      xl: 1200  // Extra large devices
    };
    this.currentBreakpoint = null;
    this.onBreakpointChange = options.onBreakpointChange || (() => {});
    this.touchEnabled = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.orientationChangeEnabled = typeof window.orientation !== 'undefined';
    this.currentOrientation = this.getOrientation();
    this.onOrientationChange = options.onOrientationChange || (() => {});
    
    this.initialize();
  }
  
  initialize() {
    // Set initial breakpoint
    this.updateBreakpoint();
    
    // Set up resize event listener
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Set up orientation change event listener if supported
    if (this.orientationChangeEnabled) {
      window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
    } else {
      // Fallback to resize event for orientation changes
      window.addEventListener('resize', this.handleOrientationChange.bind(this));
    }
    
    // Add touch class to body if touch is enabled
    if (this.touchEnabled) {
      document.body.classList.add('touch-enabled');
    } else {
      document.body.classList.add('no-touch');
    }
    
    // Add orientation class to body
    document.body.classList.add(`orientation-${this.currentOrientation}`);
  }
  
  handleResize() {
    this.updateBreakpoint();
  }
  
  handleOrientationChange() {
    const newOrientation = this.getOrientation();
    
    if (newOrientation !== this.currentOrientation) {
      document.body.classList.remove(`orientation-${this.currentOrientation}`);
      document.body.classList.add(`orientation-${newOrientation}`);
      
      this.currentOrientation = newOrientation;
      this.onOrientationChange(this.currentOrientation);
    }
  }
  
  updateBreakpoint() {
    const width = window.innerWidth;
    let newBreakpoint = null;
    
    // Determine current breakpoint
    for (const [breakpoint, minWidth] of Object.entries(this.breakpoints)) {
      if (width >= minWidth) {
        newBreakpoint = breakpoint;
      }
    }
    
    if (newBreakpoint !== this.currentBreakpoint) {
      // Remove old breakpoint class
      if (this.currentBreakpoint) {
        document.body.classList.remove(`breakpoint-${this.currentBreakpoint}`);
      }
      
      // Add new breakpoint class
      document.body.classList.add(`breakpoint-${newBreakpoint}`);
      
      this.currentBreakpoint = newBreakpoint;
      this.onBreakpointChange(this.currentBreakpoint);
    }
  }
  
  getOrientation() {
    if (this.orientationChangeEnabled) {
      return window.orientation === 0 || window.orientation === 180 ? 'portrait' : 'landscape';
    } else {
      return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }
  }
  
  isTouchEnabled() {
    return this.touchEnabled;
  }
  
  getCurrentBreakpoint() {
    return this.currentBreakpoint;
  }
  
  getCurrentOrientation() {
    return this.currentOrientation;
  }
  
  isMobile() {
    return this.currentBreakpoint === 'xs' || this.currentBreakpoint === 'sm';
  }
  
  isTablet() {
    return this.currentBreakpoint === 'md';
  }
  
  isDesktop() {
    return this.currentBreakpoint === 'lg' || this.currentBreakpoint === 'xl';
  }
}

class TouchManager {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.touchEnabled = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.gestures = {};
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.swipeThreshold = options.swipeThreshold || 50;
    this.tapThreshold = options.tapThreshold || 10;
    this.doubleTapDelay = options.doubleTapDelay || 300;
    this.longPressDelay = options.longPressDelay || 500;
    this.lastTapTime = 0;
    this.longPressTimer = null;
    
    this.initialize();
  }
  
  initialize() {
    if (!this.touchEnabled) {
      console.log('Touch not enabled on this device');
      return;
    }
    
    // Add touch event listeners
    this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
  }
  
  handleTouchStart(event) {
    if (event.touches.length === 1) {
      // Single touch
      const touch = event.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchMoveX = touch.clientX;
      this.touchMoveY = touch.clientY;
      
      // Start long press timer
      this.longPressTimer = setTimeout(() => {
        this.triggerGesture('longpress', {
          x: this.touchStartX,
          y: this.touchStartY,
          target: event.target
        });
      }, this.longPressDelay);
    } else if (event.touches.length === 2) {
      // Pinch gesture start
      this.pinchStartDistance = this.getPinchDistance(event.touches);
    }
  }
  
  handleTouchMove(event) {
    if (event.touches.length === 1) {
      // Single touch
      const touch = event.touches[0];
      this.touchMoveX = touch.clientX;
      this.touchMoveY = touch.clientY;
      
      // Clear long press timer if moved beyond threshold
      if (this.longPressTimer && this.getDistance(this.touchStartX, this.touchStartY, this.touchMoveX, this.touchMoveY) > this.tapThreshold) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      
      // Trigger pan gesture
      this.triggerGesture('pan', {
        startX: this.touchStartX,
        startY: this.touchStartY,
        currentX: this.touchMoveX,
        currentY: this.touchMoveY,
        deltaX: this.touchMoveX - this.touchStartX,
        deltaY: this.touchMoveY - this.touchStartY,
        target: event.target
      });
    } else if (event.touches.length === 2) {
      // Pinch gesture
      const currentDistance = this.getPinchDistance(event.touches);
      const initialDistance = this.pinchStartDistance || currentDistance;
      const scale = currentDistance / initialDistance;
      
      this.triggerGesture('pinch', {
        scale: scale,
        target: event.target
      });
    }
  }
  
  handleTouchEnd(event) {
    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    
    // Calculate distance moved
    const distance = this.getDistance(this.touchStartX, this.touchStartY, this.touchMoveX, this.touchMoveY);
    
    if (distance < this.tapThreshold) {
      // Tap gesture
      const now = Date.now();
      const timeSinceLastTap = now - this.lastTapTime;
      
      if (timeSinceLastTap < this.doubleTapDelay) {
        // Double tap
        this.triggerGesture('doubletap', {
          x: this.touchMoveX,
          y: this.touchMoveY,
          target: event.target
        });
        this.lastTapTime = 0; // Reset to prevent triple tap
      } else {
        // Single tap
        this.triggerGesture('tap', {
          x: this.touchMoveX,
          y: this.touchMoveY,
          target: event.target
        });
        this.lastTapTime = now;
      }
    } else if (distance >= this.swipeThreshold) {
      // Swipe gesture
      const deltaX = this.touchMoveX - this.touchStartX;
      const deltaY = this.touchMoveY - this.touchStartY;
      
      // Determine swipe direction
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0) {
          this.triggerGesture('swiperight', {
            distance: deltaX,
            target: event.target
          });
        } else {
          this.triggerGesture('swipeleft', {
            distance: -deltaX,
            target: event.target
          });
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          this.triggerGesture('swipedown', {
            distance: deltaY,
            target: event.target
          });
        } else {
          this.triggerGesture('swipeup', {
            distance: -deltaY,
            target: event.target
          });
        }
      }
    }
    
    // Reset pinch start distance
    this.pinchStartDistance = null;
  }
  
  getDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }
  
  getPinchDistance(touches) {
    return this.getDistance(
      touches[0].clientX,
      touches[0].clientY,
      touches[1].clientX,
      touches[1].clientY
    );
  }
  
  registerGesture(gesture, callback) {
    if (!this.gestures[gesture]) {
      this.gestures[gesture] = [];
    }
    
    this.gestures[gesture].push(callback);
  }
  
  unregisterGesture(gesture, callback) {
    if (!this.gestures[gesture]) {
      return;
    }
    
    this.gestures[gesture] = this.gestures[gesture].filter(cb => cb !== callback);
  }
  
  triggerGesture(gesture, data) {
    if (!this.gestures[gesture]) {
      return;
    }
    
    this.gestures[gesture].forEach(callback => {
      callback(data);
    });
  }
}

class AccessibilityManager {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.focusableSelector = options.focusableSelector || 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    this.ariaLabels = options.ariaLabels || {};
    this.ariaDescriptions = options.ariaDescriptions || {};
    this.focusTrapElements = [];
    
    this.initialize();
  }
  
  initialize() {
    // Add skip to content link
    this.addSkipToContentLink();
    
    // Set up focus trap for modals
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  addSkipToContentLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-to-content';
    skipLink.textContent = 'Skip to content';
    skipLink.style.position = 'absolute';
    skipLink.style.top = '-40px';
    skipLink.style.left = '0';
    skipLink.style.padding = '8px';
    skipLink.style.zIndex = '9999';
    skipLink.style.backgroundColor = '#ffffff';
    skipLink.style.transition = 'top 0.3s ease-in-out';
    
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '0';
    });
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
  }
  
  handleKeyDown(event) {
    // Handle Escape key for modals
    if (event.key === 'Escape') {
      this.closeActiveModal();
    }
    
    // Handle Tab key for focus trapping
    if (event.key === 'Tab' && this.focusTrapElements.length > 0) {
      const trapElement = this.focusTrapElements[this.focusTrapElements.length - 1];
      const focusableElements = this.getFocusableElements(trapElement);
      
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }
  
  closeActiveModal() {
    const activeModal = document.querySelector('.modal[aria-modal="true"]');
    
    if (activeModal) {
      const closeButton = activeModal.querySelector('.modal-close');
      
      if (closeButton) {
        closeButton.click();
      }
    }
  }
  
  getFocusableElements(container) {
    return Array.from(container.querySelectorAll(this.focusableSelector))
      .filter(element => {
        return element.offsetParent !== null && !element.disabled;
      });
  }
  
  trapFocus(element) {
    this.focusTrapElements.push(element);
    
    // Focus first focusable element
    const focusableElements = this.getFocusableElements(element);
    
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }
  
  releaseFocus(element) {
    this.focusTrapElements = this.focusTrapElements.filter(el => el !== element);
  }
  
  setAriaLabel(elementId, label) {
    const element = document.getElementById(elementId);
    
    if (element) {
      element.setAttribute('aria-label', label);
      this.ariaLabels[elementId] = label;
    }
  }
  
  setAriaDescription(elementId, description) {
    const element = document.getElementById(elementId);
    
    if (element) {
      // Create or update description element
      let descriptionElement = document.getElementById(`${elementId}-description`);
      
      if (!descriptionElement) {
        descriptionElement = document.createElement('div');
        descriptionElement.id = `${elementId}-description`;
        descriptionElement.className = 'sr-only';
        element.parentNode.insertBefore(descriptionElement, element.nextSibling);
      }
      
      descriptionElement.textContent = description;
      element.setAttribute('aria-describedby', descriptionElement.id);
      this.ariaDescriptions[elementId] = description;
    }
  }
  
  announceToScreenReader(message, politeness = 'polite') {
    // Create or get live region
    let liveRegion = document.getElementById('accessibility-live-region');
    
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'accessibility-live-region';
      liveRegion.className = 'sr-only';
      liveRegion.setAttribute('aria-live', politeness);
      liveRegion.setAttribute('aria-relevant', 'additions');
      document.body.appendChild(liveRegion);
    }
    
    // Set politeness
    liveRegion.setAttribute('aria-live', politeness);
    
    // Clear existing content
    liveRegion.textContent = '';
    
    // Add new content after a small delay to ensure announcement
    setTimeout(() => {
      liveRegion.textContent = message;
    }, 50);
  }
}

class MobileOptimizationManager {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.responsiveManager = options.responsiveManager || new ResponsivenessManager();
    this.touchManager = options.touchManager || new TouchManager();
    this.accessibilityManager = options.accessibilityManager || new AccessibilityManager();
    this.bottomNavEnabled = options.bottomNavEnabled !== undefined ? options.bottomNavEnabled : true;
    this.bottomNavItems = options.bottomNavItems || [];
    this.bottomNav = null;
    
    this.initialize();
  }
  
  initialize() {
    // Add viewport meta tag if not present
    this.ensureViewportMeta();
    
    // Add mobile optimized styles
    this.addMobileStyles();
    
    // Create bottom navigation if enabled
    if (this.bottomNavEnabled && this.bottomNavItems.length > 0) {
      this.createBottomNav();
    }
    
    // Add pull-to-refresh functionality
    this.setupPullToRefresh();
  }
  
  ensureViewportMeta() {
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(viewportMeta);
    }
  }
  
  addMobileStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      /* Mobile Optimization Styles */
      
      /* Base styles */
      * {
        box-sizing: border-box;
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
      }
      
      body {
        margin: 0;
        padding: 0;
        -webkit-text-size-adjust: 100%;
      }
      
      /* Touch target size */
      .touch-enabled button,
      .touch-enabled .button,
      .touch-enabled a.button,
      .touch-enabled input[type="button"],
      .touch-enabled input[type="submit"],
      .touch-enabled input[type="reset"] {
        min-height: 44px;
        min-width: 44px;
      }
      
      /* Bottom navigation */
      .bottom-nav {
        display: none;
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        background-color: #ffffff;
        box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
        z-index: 1000;
      }
      
      .bottom-nav-inner {
        display: flex;
        justify-content: space-around;
        align-items: center;
        height: 56px;
      }
      
      .bottom-nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
        height: 100%;
        text-decoration: none;
        color: #757575;
        font-size: 12px;
        padding: 8px 0;
      }
      
      .bottom-nav-item.active {
        color: #1A2342;
      }
      
      .bottom-nav-icon {
        font-size: 24px;
        margin-bottom: 4px;
      }
      
      /* Show bottom nav on mobile */
      .breakpoint-xs .bottom-nav,
      .breakpoint-sm .bottom-nav {
        display: block;
      }
      
      /* Add padding to main content when bottom nav is visible */
      .breakpoint-xs .main-content,
      .breakpoint-sm .main-content {
        padding-bottom: 56px;
      }
      
      /* Pull to refresh */
      .pull-to-refresh {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: translateY(-100%);
        transition: transform 0.2s ease-out;
      }
      
      .pull-to-refresh-spinner {
        width: 24px;
        height: 24px;
        border: 2px solid rgba(0, 0, 0, 0.1);
        border-top-color: #1A2342;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      /* Screen reader only */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      
      /* Responsive adjustments */
      .breakpoint-xs .desktop-only,
      .breakpoint-sm .desktop-only {
        display: none !important;
      }
      
      .breakpoint-md .mobile-only,
      .breakpoint-lg .mobile-only,
      .breakpoint-xl .mobile-only {
        display: none !important;
      }
      
      /* Orientation specific */
      .orientation-portrait .landscape-only {
        display: none !important;
      }
      
      .orientation-landscape .portrait-only {
        display: none !important;
      }
    `;
    
    document.head.appendChild(styleElement);
  }
  
  createBottomNav() {
    // Create bottom nav element
    this.bottomNav = document.createElement('nav');
    this.bottomNav.className = 'bottom-nav';
    this.bottomNav.setAttribute('aria-label', 'Main Navigation');
    
    // Create inner container
    const innerContainer = document.createElement('div');
    innerContainer.className = 'bottom-nav-inner';
    
    // Add items
    this.bottomNavItems.forEach(item => {
      const navItem = document.createElement('a');
      navItem.href = item.href || '#';
      navItem.className = 'bottom-nav-item';
      navItem.setAttribute('aria-label', item.label);
      
      if (item.active) {
        navItem.classList.add('active');
      }
      
      // Add icon
      const icon = document.createElement('span');
      icon.className = 'bottom-nav-icon';
      icon.innerHTML = item.icon || '';
      navItem.appendChild(icon);
      
      // Add label
      const label = document.createElement('span');
      label.className = 'bottom-nav-label';
      label.textContent = item.label;
      navItem.appendChild(label);
      
      // Add click handler
      if (item.onClick) {
        navItem.addEventListener('click', (event) => {
          event.preventDefault();
          item.onClick();
        });
      }
      
      innerContainer.appendChild(navItem);
    });
    
    this.bottomNav.appendChild(innerContainer);
    document.body.appendChild(this.bottomNav);
  }
  
  setupPullToRefresh(callback) {
    if (!this.touchManager.touchEnabled) {
      return;
    }
    
    // Create pull to refresh element
    const pullToRefreshElement = document.createElement('div');
    pullToRefreshElement.className = 'pull-to-refresh';
    
    const spinner = document.createElement('div');
    spinner.className = 'pull-to-refresh-spinner';
    pullToRefreshElement.appendChild(spinner);
    
    document.body.appendChild(pullToRefreshElement);
    
    // Variables for pull to refresh
    let startY = 0;
    let currentY = 0;
    let refreshing = false;
    let pullDistance = 0;
    const maxPullDistance = 100;
    const refreshThreshold = 70;
    
    // Register touch events
    this.touchManager.registerGesture('pan', (data) => {
      // Only handle downward pans from the top of the page
      if (data.startY > 50 || document.scrollingElement.scrollTop > 0) {
        return;
      }
      
      startY = data.startY;
      currentY = data.currentY;
      pullDistance = Math.max(0, currentY - startY);
      
      if (pullDistance > 0 && !refreshing) {
        // Prevent default scrolling
        document.body.style.overflow = 'hidden';
        
        // Calculate pull percentage
        const pullPercentage = Math.min(pullDistance / maxPullDistance, 1);
        
        // Update pull to refresh element
        pullToRefreshElement.style.transform = `translateY(${pullDistance * 0.5}px)`;
        
        // Prevent default
        event.preventDefault();
      }
    });
    
    this.touchManager.registerGesture('tap', () => {
      // Reset pull to refresh
      if (!refreshing) {
        pullToRefreshElement.style.transform = 'translateY(-100%)';
        document.body.style.overflow = '';
      }
    });
    
    this.touchManager.registerGesture('swipedown', (data) => {
      // Only handle swipes from the top of the page
      if (startY > 50 || document.scrollingElement.scrollTop > 0) {
        return;
      }
      
      if (pullDistance >= refreshThreshold && !refreshing && callback) {
        // Trigger refresh
        refreshing = true;
        pullToRefreshElement.style.transform = 'translateY(0)';
        
        // Call callback
        callback().then(() => {
          // Reset after refresh
          setTimeout(() => {
            pullToRefreshElement.style.transform = 'translateY(-100%)';
            document.body.style.overflow = '';
            refreshing = false;
          }, 500);
        }).catch(() => {
          // Reset on error
          pullToRefreshElement.style.transform = 'translateY(-100%)';
          document.body.style.overflow = '';
          refreshing = false;
        });
      } else {
        // Reset pull to refresh
        pullToRefreshElement.style.transform = 'translateY(-100%)';
        document.body.style.overflow = '';
      }
    });
  }
  
  setBottomNavActive(index) {
    if (!this.bottomNav) {
      return;
    }
    
    const items = this.bottomNav.querySelectorAll('.bottom-nav-item');
    
    items.forEach((item, i) => {
      if (i === index) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
  
  updateBottomNavItems(items) {
    this.bottomNavItems = items;
    
    if (this.bottomNav) {
      // Remove existing bottom nav
      document.body.removeChild(this.bottomNav);
      this.bottomNav = null;
      
      // Create new bottom nav
      if (this.bottomNavEnabled && this.bottomNavItems.length > 0) {
        this.createBottomNav();
      }
    }
  }
  
  enableBottomNav() {
    this.bottomNavEnabled = true;
    
    if (this.bottomNavItems.length > 0 && !this.bottomNav) {
      this.createBottomNav();
    }
  }
  
  disableBottomNav() {
    this.bottomNavEnabled = false;
    
    if (this.bottomNav) {
      document.body.removeChild(this.bottomNav);
      this.bottomNav = null;
    }
  }
}

// Export the module
export {
  ResponsivenessManager,
  TouchManager,
  AccessibilityManager,
  MobileOptimizationManager
};
