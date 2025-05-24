/**
 * User Experience Module
 * 
 * This module provides enhanced user experience features for the Construction Estimator app,
 * including loading screens, instructions, tooltips, and visual feedback.
 */

class LoadingScreen {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.logo = options.logo || null;
    this.backgroundColor = options.backgroundColor || '#ffffff';
    this.textColor = options.textColor || '#1A2342';
    this.accentColor = options.accentColor || '#F04D4E';
    this.tips = options.tips || [
      'Drag shapes to position them precisely',
      'Use the grid for accurate measurements',
      'Try the L-shape tool for corner countertops',
      'Double-click a shape to edit its properties',
      'Save your design to revisit it later',
      'Add multiple countertop sections for complex layouts',
      'Accurate measurements ensure precise quotes'
    ];
    this.loadingElement = null;
    this.progressBar = null;
    this.tipElement = null;
    this.progress = 0;
    this.visible = false;
    this.tipInterval = null;
    this.currentTipIndex = 0;
    
    this.initialize();
  }
  
  initialize() {
    // Create loading screen element
    this.loadingElement = document.createElement('div');
    this.loadingElement.className = 'loading-screen';
    this.loadingElement.style.position = 'fixed';
    this.loadingElement.style.top = '0';
    this.loadingElement.style.left = '0';
    this.loadingElement.style.width = '100%';
    this.loadingElement.style.height = '100%';
    this.loadingElement.style.backgroundColor = this.backgroundColor;
    this.loadingElement.style.display = 'flex';
    this.loadingElement.style.flexDirection = 'column';
    this.loadingElement.style.alignItems = 'center';
    this.loadingElement.style.justifyContent = 'center';
    this.loadingElement.style.zIndex = '9999';
    this.loadingElement.style.opacity = '0';
    this.loadingElement.style.transition = 'opacity 0.3s ease-in-out';
    
    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.className = 'loading-content';
    contentContainer.style.textAlign = 'center';
    contentContainer.style.maxWidth = '80%';
    
    // Add logo if provided
    if (this.logo) {
      const logoElement = document.createElement('img');
      logoElement.src = this.logo;
      logoElement.alt = 'Logo';
      logoElement.style.maxWidth = '200px';
      logoElement.style.marginBottom = '20px';
      contentContainer.appendChild(logoElement);
    }
    
    // Add title
    const titleElement = document.createElement('h2');
    titleElement.textContent = 'Loading Your Estimator';
    titleElement.style.color = this.textColor;
    titleElement.style.fontFamily = 'Arial, sans-serif';
    titleElement.style.marginBottom = '20px';
    contentContainer.appendChild(titleElement);
    
    // Add progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.style.width = '300px';
    progressContainer.style.height = '10px';
    progressContainer.style.backgroundColor = '#e0e0e0';
    progressContainer.style.borderRadius = '5px';
    progressContainer.style.overflow = 'hidden';
    progressContainer.style.marginBottom = '20px';
    
    // Add progress bar
    this.progressBar = document.createElement('div');
    this.progressBar.style.width = '0%';
    this.progressBar.style.height = '100%';
    this.progressBar.style.backgroundColor = this.accentColor;
    this.progressBar.style.transition = 'width 0.3s ease-in-out';
    progressContainer.appendChild(this.progressBar);
    contentContainer.appendChild(progressContainer);
    
    // Add tip element
    this.tipElement = document.createElement('p');
    this.tipElement.style.color = this.textColor;
    this.tipElement.style.fontFamily = 'Arial, sans-serif';
    this.tipElement.style.fontSize = '14px';
    this.tipElement.style.marginTop = '20px';
    this.tipElement.style.minHeight = '40px';
    this.updateTip();
    contentContainer.appendChild(this.tipElement);
    
    // Add content container to loading element
    this.loadingElement.appendChild(contentContainer);
    
    // Add loading element to container
    this.container.appendChild(this.loadingElement);
  }
  
  show() {
    if (this.visible) return;
    
    this.visible = true;
    this.loadingElement.style.display = 'flex';
    
    // Trigger reflow to ensure transition works
    this.loadingElement.offsetHeight;
    
    this.loadingElement.style.opacity = '1';
    
    // Start cycling through tips
    this.startTipCycle();
  }
  
  hide() {
    if (!this.visible) return;
    
    this.visible = false;
    this.loadingElement.style.opacity = '0';
    
    // Stop cycling through tips
    this.stopTipCycle();
    
    // Remove element after transition
    setTimeout(() => {
      if (!this.visible) {
        this.loadingElement.style.display = 'none';
      }
    }, 300);
  }
  
  updateProgress(progress) {
    this.progress = Math.min(Math.max(progress, 0), 100);
    this.progressBar.style.width = `${this.progress}%`;
    
    // Auto-hide when progress reaches 100%
    if (this.progress >= 100) {
      setTimeout(() => {
        this.hide();
      }, 500);
    }
  }
  
  updateTip() {
    if (this.tips.length === 0) return;
    
    this.tipElement.textContent = this.tips[this.currentTipIndex];
    this.currentTipIndex = (this.currentTipIndex + 1) % this.tips.length;
  }
  
  startTipCycle() {
    this.stopTipCycle();
    this.tipInterval = setInterval(() => {
      this.updateTip();
    }, 5000);
  }
  
  stopTipCycle() {
    if (this.tipInterval) {
      clearInterval(this.tipInterval);
      this.tipInterval = null;
    }
  }
}

class InstructionManager {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.textColor = options.textColor || '#1A2342';
    this.backgroundColor = options.backgroundColor || '#ffffff';
    this.accentColor = options.accentColor || '#F04D4E';
    this.tutorialSteps = options.tutorialSteps || [];
    this.tooltips = {};
    this.currentTutorialStep = 0;
    this.tutorialElement = null;
    this.tutorialVisible = false;
    this.helpButton = null;
    
    this.initialize();
  }
  
  initialize() {
    // Create help button
    this.createHelpButton();
    
    // Create tutorial element
    this.createTutorialElement();
  }
  
  createHelpButton() {
    this.helpButton = document.createElement('button');
    this.helpButton.className = 'help-button';
    this.helpButton.innerHTML = '?';
    this.helpButton.style.position = 'fixed';
    this.helpButton.style.bottom = '20px';
    this.helpButton.style.right = '20px';
    this.helpButton.style.width = '40px';
    this.helpButton.style.height = '40px';
    this.helpButton.style.borderRadius = '50%';
    this.helpButton.style.backgroundColor = this.accentColor;
    this.helpButton.style.color = '#ffffff';
    this.helpButton.style.border = 'none';
    this.helpButton.style.fontSize = '20px';
    this.helpButton.style.fontWeight = 'bold';
    this.helpButton.style.cursor = 'pointer';
    this.helpButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
    this.helpButton.style.zIndex = '1000';
    
    this.helpButton.addEventListener('click', () => {
      this.toggleTutorial();
    });
    
    this.container.appendChild(this.helpButton);
  }
  
  createTutorialElement() {
    this.tutorialElement = document.createElement('div');
    this.tutorialElement.className = 'tutorial-overlay';
    this.tutorialElement.style.position = 'fixed';
    this.tutorialElement.style.top = '0';
    this.tutorialElement.style.left = '0';
    this.tutorialElement.style.width = '100%';
    this.tutorialElement.style.height = '100%';
    this.tutorialElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.tutorialElement.style.display = 'none';
    this.tutorialElement.style.alignItems = 'center';
    this.tutorialElement.style.justifyContent = 'center';
    this.tutorialElement.style.zIndex = '9000';
    
    // Create tutorial content container
    const contentContainer = document.createElement('div');
    contentContainer.className = 'tutorial-content';
    contentContainer.style.backgroundColor = this.backgroundColor;
    contentContainer.style.borderRadius = '8px';
    contentContainer.style.padding = '30px';
    contentContainer.style.maxWidth = '600px';
    contentContainer.style.width = '80%';
    contentContainer.style.maxHeight = '80vh';
    contentContainer.style.overflow = 'auto';
    contentContainer.style.position = 'relative';
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = this.textColor;
    
    closeButton.addEventListener('click', () => {
      this.hideTutorial();
    });
    
    contentContainer.appendChild(closeButton);
    
    // Create step content
    const stepContent = document.createElement('div');
    stepContent.className = 'tutorial-step-content';
    contentContainer.appendChild(stepContent);
    
    // Create navigation buttons
    const navContainer = document.createElement('div');
    navContainer.style.display = 'flex';
    navContainer.style.justifyContent = 'space-between';
    navContainer.style.marginTop = '20px';
    
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.style.padding = '8px 16px';
    prevButton.style.backgroundColor = '#e0e0e0';
    prevButton.style.border = 'none';
    prevButton.style.borderRadius = '4px';
    prevButton.style.cursor = 'pointer';
    
    prevButton.addEventListener('click', () => {
      this.previousTutorialStep();
    });
    
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.style.padding = '8px 16px';
    nextButton.style.backgroundColor = this.accentColor;
    nextButton.style.color = '#ffffff';
    nextButton.style.border = 'none';
    nextButton.style.borderRadius = '4px';
    nextButton.style.cursor = 'pointer';
    
    nextButton.addEventListener('click', () => {
      this.nextTutorialStep();
    });
    
    navContainer.appendChild(prevButton);
    navContainer.appendChild(nextButton);
    contentContainer.appendChild(navContainer);
    
    this.tutorialElement.appendChild(contentContainer);
    this.container.appendChild(this.tutorialElement);
  }
  
  setTutorialSteps(steps) {
    this.tutorialSteps = steps;
    this.currentTutorialStep = 0;
    this.updateTutorialContent();
  }
  
  updateTutorialContent() {
    if (this.tutorialSteps.length === 0) return;
    
    const step = this.tutorialSteps[this.currentTutorialStep];
    const stepContent = this.tutorialElement.querySelector('.tutorial-step-content');
    
    // Clear existing content
    stepContent.innerHTML = '';
    
    // Add step title
    const titleElement = document.createElement('h2');
    titleElement.textContent = step.title;
    titleElement.style.color = this.textColor;
    titleElement.style.marginBottom = '15px';
    stepContent.appendChild(titleElement);
    
    // Add step description
    const descriptionElement = document.createElement('p');
    descriptionElement.textContent = step.description;
    descriptionElement.style.marginBottom = '15px';
    descriptionElement.style.lineHeight = '1.5';
    stepContent.appendChild(descriptionElement);
    
    // Add step image if provided
    if (step.image) {
      const imageElement = document.createElement('img');
      imageElement.src = step.image;
      imageElement.alt = step.title;
      imageElement.style.maxWidth = '100%';
      imageElement.style.marginBottom = '15px';
      imageElement.style.borderRadius = '4px';
      stepContent.appendChild(imageElement);
    }
    
    // Update navigation buttons
    const prevButton = this.tutorialElement.querySelector('button:first-of-type');
    const nextButton = this.tutorialElement.querySelector('button:last-of-type');
    
    prevButton.disabled = this.currentTutorialStep === 0;
    prevButton.style.opacity = prevButton.disabled ? '0.5' : '1';
    
    const isLastStep = this.currentTutorialStep === this.tutorialSteps.length - 1;
    nextButton.textContent = isLastStep ? 'Finish' : 'Next';
  }
  
  showTutorial() {
    if (this.tutorialVisible) return;
    
    this.tutorialVisible = true;
    this.currentTutorialStep = 0;
    this.updateTutorialContent();
    this.tutorialElement.style.display = 'flex';
  }
  
  hideTutorial() {
    if (!this.tutorialVisible) return;
    
    this.tutorialVisible = false;
    this.tutorialElement.style.display = 'none';
  }
  
  toggleTutorial() {
    if (this.tutorialVisible) {
      this.hideTutorial();
    } else {
      this.showTutorial();
    }
  }
  
  nextTutorialStep() {
    if (this.currentTutorialStep < this.tutorialSteps.length - 1) {
      this.currentTutorialStep++;
      this.updateTutorialContent();
    } else {
      this.hideTutorial();
    }
  }
  
  previousTutorialStep() {
    if (this.currentTutorialStep > 0) {
      this.currentTutorialStep--;
      this.updateTutorialContent();
    }
  }
  
  createTooltip(elementId, content, position = 'top') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Create tooltip element
    const tooltipElement = document.createElement('div');
    tooltipElement.className = 'tooltip';
    tooltipElement.textContent = content;
    tooltipElement.style.position = 'absolute';
    tooltipElement.style.backgroundColor = this.textColor;
    tooltipElement.style.color = '#ffffff';
    tooltipElement.style.padding = '8px 12px';
    tooltipElement.style.borderRadius = '4px';
    tooltipElement.style.fontSize = '14px';
    tooltipElement.style.zIndex = '1000';
    tooltipElement.style.maxWidth = '200px';
    tooltipElement.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
    tooltipElement.style.pointerEvents = 'none';
    tooltipElement.style.opacity = '0';
    tooltipElement.style.transition = 'opacity 0.2s ease-in-out';
    
    // Add arrow
    const arrow = document.createElement('div');
    arrow.style.position = 'absolute';
    arrow.style.width = '0';
    arrow.style.height = '0';
    arrow.style.borderLeft = '6px solid transparent';
    arrow.style.borderRight = '6px solid transparent';
    arrow.style.borderTop = `6px solid ${this.textColor}`;
    
    // Position arrow based on tooltip position
    switch (position) {
      case 'top':
        arrow.style.bottom = '-6px';
        arrow.style.left = '50%';
        arrow.style.transform = 'translateX(-50%)';
        break;
      case 'bottom':
        arrow.style.top = '-6px';
        arrow.style.left = '50%';
        arrow.style.transform = 'translateX(-50%) rotate(180deg)';
        break;
      case 'left':
        arrow.style.right = '-6px';
        arrow.style.top = '50%';
        arrow.style.transform = 'translateY(-50%) rotate(-90deg)';
        break;
      case 'right':
        arrow.style.left = '-6px';
        arrow.style.top = '50%';
        arrow.style.transform = 'translateY(-50%) rotate(90deg)';
        break;
    }
    
    tooltipElement.appendChild(arrow);
    document.body.appendChild(tooltipElement);
    
    // Store tooltip
    this.tooltips[elementId] = {
      element: tooltipElement,
      position: position
    };
    
    // Add event listeners
    element.addEventListener('mouseenter', () => {
      this.showTooltip(elementId);
    });
    
    element.addEventListener('mouseleave', () => {
      this.hideTooltip(elementId);
    });
  }
  
  showTooltip(elementId) {
    const tooltip = this.tooltips[elementId];
    if (!tooltip) return;
    
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const tooltipElement = tooltip.element;
    const position = tooltip.position;
    
    // Position tooltip
    const rect = element.getBoundingClientRect();
    
    switch (position) {
      case 'top':
        tooltipElement.style.bottom = `${window.innerHeight - rect.top + 10}px`;
        tooltipElement.style.left = `${rect.left + rect.width / 2}px`;
        tooltipElement.style.transform = 'translateX(-50%)';
        break;
      case 'bottom':
        tooltipElement.style.top = `${rect.bottom + 10}px`;
        tooltipElement.style.left = `${rect.left + rect.width / 2}px`;
        tooltipElement.style.transform = 'translateX(-50%)';
        break;
      case 'left':
        tooltipElement.style.right = `${window.innerWidth - rect.left + 10}px`;
        tooltipElement.style.top = `${rect.top + rect.height / 2}px`;
        tooltipElement.style.transform = 'translateY(-50%)';
        break;
      case 'right':
        tooltipElement.style.left = `${rect.right + 10}px`;
        tooltipElement.style.top = `${rect.top + rect.height / 2}px`;
        tooltipElement.style.transform = 'translateY(-50%)';
        break;
    }
    
    // Show tooltip
    tooltipElement.style.opacity = '1';
  }
  
  hideTooltip(elementId) {
    const tooltip = this.tooltips[elementId];
    if (!tooltip) return;
    
    tooltip.element.style.opacity = '0';
  }
  
  removeTooltip(elementId) {
    const tooltip = this.tooltips[elementId];
    if (!tooltip) return;
    
    document.body.removeChild(tooltip.element);
    delete this.tooltips[elementId];
  }
}

class VisualFeedbackManager {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.accentColor = options.accentColor || '#F04D4E';
    this.successColor = options.successColor || '#4CAF50';
    this.warningColor = options.warningColor || '#FFC107';
    this.errorColor = options.errorColor || '#F44336';
    this.toastDuration = options.toastDuration || 3000;
    this.toastContainer = null;
    
    this.initialize();
  }
  
  initialize() {
    // Create toast container
    this.toastContainer = document.createElement('div');
    this.toastContainer.className = 'toast-container';
    this.toastContainer.style.position = 'fixed';
    this.toastContainer.style.bottom = '20px';
    this.toastContainer.style.left = '20px';
    this.toastContainer.style.zIndex = '9999';
    
    this.container.appendChild(this.toastContainer);
  }
  
  showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.backgroundColor = '#ffffff';
    toast.style.color = '#333333';
    toast.style.padding = '12px 16px';
    toast.style.borderRadius = '4px';
    toast.style.marginTop = '10px';
    toast.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.minWidth = '250px';
    toast.style.maxWidth = '350px';
    toast.style.transform = 'translateX(-100%)';
    toast.style.opacity = '0';
    toast.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
    
    // Add colored indicator based on type
    const indicator = document.createElement('div');
    indicator.style.width = '4px';
    indicator.style.height = '100%';
    indicator.style.position = 'absolute';
    indicator.style.left = '0';
    indicator.style.top = '0';
    indicator.style.bottom = '0';
    indicator.style.borderTopLeftRadius = '4px';
    indicator.style.borderBottomLeftRadius = '4px';
    
    switch (type) {
      case 'success':
        indicator.style.backgroundColor = this.successColor;
        break;
      case 'warning':
        indicator.style.backgroundColor = this.warningColor;
        break;
      case 'error':
        indicator.style.backgroundColor = this.errorColor;
        break;
      default:
        indicator.style.backgroundColor = this.accentColor;
        break;
    }
    
    toast.appendChild(indicator);
    
    // Add message
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.marginLeft = '10px';
    toast.appendChild(messageElement);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.marginLeft = 'auto';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '18px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = '#333333';
    
    closeButton.addEventListener('click', () => {
      this.hideToast(toast);
    });
    
    toast.appendChild(closeButton);
    
    // Add to container
    this.toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    }, 10);
    
    // Auto-hide after duration
    const timeout = setTimeout(() => {
      this.hideToast(toast);
    }, this.toastDuration);
    
    // Store timeout in toast element
    toast.dataset.timeout = timeout;
    
    return toast;
  }
  
  hideToast(toast) {
    // Clear timeout
    clearTimeout(toast.dataset.timeout);
    
    // Trigger hide animation
    toast.style.transform = 'translateX(-100%)';
    toast.style.opacity = '0';
    
    // Remove after animation
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
  
  showSnackbar(message, action = null) {
    // Create snackbar element
    const snackbar = document.createElement('div');
    snackbar.className = 'snackbar';
    snackbar.style.position = 'fixed';
    snackbar.style.bottom = '20px';
    snackbar.style.left = '50%';
    snackbar.style.transform = 'translateX(-50%) translateY(100%)';
    snackbar.style.backgroundColor = '#333333';
    snackbar.style.color = '#ffffff';
    snackbar.style.padding = '14px 16px';
    snackbar.style.borderRadius = '4px';
    snackbar.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.16)';
    snackbar.style.display = 'flex';
    snackbar.style.alignItems = 'center';
    snackbar.style.minWidth = '250px';
    snackbar.style.maxWidth = '80%';
    snackbar.style.zIndex = '9999';
    snackbar.style.transition = 'transform 0.3s ease-out';
    
    // Add message
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.flex = '1';
    snackbar.appendChild(messageElement);
    
    // Add action button if provided
    if (action && action.text) {
      const actionButton = document.createElement('button');
      actionButton.textContent = action.text;
      actionButton.style.marginLeft = '10px';
      actionButton.style.backgroundColor = 'transparent';
      actionButton.style.border = 'none';
      actionButton.style.color = this.accentColor;
      actionButton.style.fontWeight = 'bold';
      actionButton.style.textTransform = 'uppercase';
      actionButton.style.cursor = 'pointer';
      
      actionButton.addEventListener('click', () => {
        if (action.callback) {
          action.callback();
        }
        this.hideSnackbar(snackbar);
      });
      
      snackbar.appendChild(actionButton);
    }
    
    // Add to container
    this.container.appendChild(snackbar);
    
    // Trigger animation
    setTimeout(() => {
      snackbar.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
    
    // Auto-hide after duration
    const timeout = setTimeout(() => {
      this.hideSnackbar(snackbar);
    }, this.toastDuration);
    
    // Store timeout in snackbar element
    snackbar.dataset.timeout = timeout;
    
    return snackbar;
  }
  
  hideSnackbar(snackbar) {
    // Clear timeout
    clearTimeout(snackbar.dataset.timeout);
    
    // Trigger hide animation
    snackbar.style.transform = 'translateX(-50%) translateY(100%)';
    
    // Remove after animation
    setTimeout(() => {
      if (snackbar.parentNode) {
        snackbar.parentNode.removeChild(snackbar);
      }
    }, 300);
  }
  
  highlightElement(elementId, duration = 1500) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Store original background
    const originalBackground = element.style.backgroundColor;
    const originalTransition = element.style.transition;
    
    // Add highlight
    element.style.transition = 'background-color 0.3s ease-in-out';
    element.style.backgroundColor = this.accentColor;
    
    // Restore original background after duration
    setTimeout(() => {
      element.style.backgroundColor = originalBackground;
      
      // Restore original transition after animation
      setTimeout(() => {
        element.style.transition = originalTransition;
      }, 300);
    }, duration);
  }
  
  showConfirmation(message, onConfirm, onCancel) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'confirmation-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';
    
    // Create confirmation dialog
    const dialog = document.createElement('div');
    dialog.className = 'confirmation-dialog';
    dialog.style.backgroundColor = '#ffffff';
    dialog.style.borderRadius = '8px';
    dialog.style.padding = '20px';
    dialog.style.maxWidth = '400px';
    dialog.style.width = '80%';
    dialog.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    
    // Add message
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messageElement.style.marginBottom = '20px';
    dialog.appendChild(messageElement);
    
    // Add buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.justifyContent = 'flex-end';
    
    // Add cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.marginRight = '10px';
    cancelButton.style.padding = '8px 16px';
    cancelButton.style.backgroundColor = '#e0e0e0';
    cancelButton.style.border = 'none';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.cursor = 'pointer';
    
    cancelButton.addEventListener('click', () => {
      if (onCancel) {
        onCancel();
      }
      this.container.removeChild(overlay);
    });
    
    buttonsContainer.appendChild(cancelButton);
    
    // Add confirm button
    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'Confirm';
    confirmButton.style.padding = '8px 16px';
    confirmButton.style.backgroundColor = this.accentColor;
    confirmButton.style.color = '#ffffff';
    confirmButton.style.border = 'none';
    confirmButton.style.borderRadius = '4px';
    confirmButton.style.cursor = 'pointer';
    
    confirmButton.addEventListener('click', () => {
      if (onConfirm) {
        onConfirm();
      }
      this.container.removeChild(overlay);
    });
    
    buttonsContainer.appendChild(confirmButton);
    dialog.appendChild(buttonsContainer);
    
    overlay.appendChild(dialog);
    this.container.appendChild(overlay);
  }
}

class UserExperienceManager {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.textColor = options.textColor || '#1A2342';
    this.backgroundColor = options.backgroundColor || '#ffffff';
    this.accentColor = options.accentColor || '#F04D4E';
    
    this.loadingScreen = new LoadingScreen({
      container: this.container,
      logo: options.logo,
      backgroundColor: this.backgroundColor,
      textColor: this.textColor,
      accentColor: this.accentColor,
      tips: options.tips
    });
    
    this.instructionManager = new InstructionManager({
      container: this.container,
      textColor: this.textColor,
      backgroundColor: this.backgroundColor,
      accentColor: this.accentColor
    });
    
    this.visualFeedbackManager = new VisualFeedbackManager({
      container: this.container,
      accentColor: this.accentColor
    });
  }
  
  showLoading() {
    this.loadingScreen.show();
  }
  
  updateLoadingProgress(progress) {
    this.loadingScreen.updateProgress(progress);
  }
  
  hideLoading() {
    this.loadingScreen.hide();
  }
  
  setTutorialSteps(steps) {
    this.instructionManager.setTutorialSteps(steps);
  }
  
  showTutorial() {
    this.instructionManager.showTutorial();
  }
  
  hideTutorial() {
    this.instructionManager.hideTutorial();
  }
  
  createTooltip(elementId, content, position = 'top') {
    this.instructionManager.createTooltip(elementId, content, position);
  }
  
  showToast(message, type = 'info') {
    return this.visualFeedbackManager.showToast(message, type);
  }
  
  showSnackbar(message, action = null) {
    return this.visualFeedbackManager.showSnackbar(message, action);
  }
  
  highlightElement(elementId, duration = 1500) {
    this.visualFeedbackManager.highlightElement(elementId, duration);
  }
  
  showConfirmation(message, onConfirm, onCancel) {
    this.visualFeedbackManager.showConfirmation(message, onConfirm, onCancel);
  }
}

// Default tutorial steps
const DEFAULT_TUTORIAL_STEPS = [
  {
    title: 'Welcome to the Construction Estimator',
    description: 'This tutorial will guide you through creating accurate countertop layouts and getting precise quotes. Use the Next button to continue.',
    image: null
  },
  {
    title: 'Drawing Tools',
    description: 'Use the drawing tools on the left to create your countertop layout. You can choose from rectangle, L-shape, U-shape, and island shapes, or draw custom shapes.',
    image: null
  },
  {
    title: 'Shape Properties',
    description: 'After drawing a shape, you can adjust its properties like dimensions, edge type, and material. Select a shape and use the properties panel on the right.',
    image: null
  },
  {
    title: 'Multiple Countertops',
    description: 'Add multiple countertop sections to create complex layouts. Each section can have different materials and edge types.',
    image: null
  },
  {
    title: 'Real-time Estimation',
    description: 'As you create your layout, the app calculates costs in real-time. You can see a breakdown of material, labor, and additional costs.',
    image: null
  },
  {
    title: 'Saving and Sharing',
    description: 'When you\'re done, you can save your design, get a detailed quote, or share it with others. Use the buttons at the bottom of the screen.',
    image: null
  }
];

// Export the module
export {
  UserExperienceManager,
  LoadingScreen,
  InstructionManager,
  VisualFeedbackManager,
  DEFAULT_TUTORIAL_STEPS
};
