// Config
const isOpenClass = 'modal-is-open';
const openingClass = 'modal-is-opening';
const closingClass = 'modal-is-closing';
const animationDuration = 400; // ms
let visibleModal = null;

// Toggle modal
export const toggleModal = (event) => {
  event.preventDefault();
  const modal = document.getElementById(
    event.currentTarget.getAttribute('data-target'),
  );
  typeof modal != 'undefined' && modal != null && isModalOpen(modal)
    ? closeModal(modal)
    : openModal(modal);
};

// Is modal open
export const isModalOpen = (modal) => {
  return modal.hasAttribute('open') && modal.getAttribute('open') !== 'false';
};

// Open modal
export const openModal = (modal) => {
  if (isScrollbarVisible()) {
    document.documentElement.style.setProperty(
      '--scrollbar-width',
      `${getScrollbarWidth()}px`,
    );
  }
  document.documentElement.classList.add(isOpenClass, openingClass);
  setTimeout(() => {
    visibleModal = modal;
    document.documentElement.classList.remove(openingClass);
  }, animationDuration);
  modal.setAttribute('open', true);
};

// Close modal
export const closeModal = (modal) => {
  visibleModal = null;
  document.documentElement.classList.add(closingClass);
  setTimeout(() => {
    document.documentElement.classList.remove(closingClass, isOpenClass);
    document.documentElement.style.removeProperty('--scrollbar-width');
    modal.removeAttribute('open');
  }, animationDuration);
};

// Close with a click outside
document.addEventListener('click', (event) => {
  if (visibleModal != null) {
    const modalContent = visibleModal.querySelector('article');
    const isClickInside = modalContent.contains(event.target);
    !isClickInside && closeModal(visibleModal);
  }
});

// Close with Esc key
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && visibleModal != null) {
    closeModal(visibleModal);
  }
});

// Get scrollbar width
export const getScrollbarWidth = () => {
  // Creating invisible container
  const outer = document.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.overflow = 'scroll'; // forcing scrollbar to appear
  outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps
  document.body.appendChild(outer);

  // Creating inner element and placing it in the container
  const inner = document.createElement('div');
  outer.appendChild(inner);

  // Calculating difference between container's full width and the child width
  const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;

  // Removing temporary elements from the DOM
  outer.parentNode.removeChild(outer);

  return scrollbarWidth;
};

// Is scrollbar visible
const isScrollbarVisible = () => {
  return document.body.scrollHeight > screen.height;
};

export function init({ openEl, closeEl, onOpen, onClose }) {
  let open =
    typeof openEl === 'string' ? document.getElementById(openEl) : openEl;
  let close =
    typeof closeEl === 'string' ? document.getElementById(closeEl) : closeEl;

  // Handle Open
  open.addEventListener('click', (e) => {
    if (typeof onOpen === 'function') onOpen(e);
    toggleModal(e);
  });

  // Handle Close
  close.addEventListener('click', (e) => {
    if (typeof onClose === 'function') onClose(e);
    toggleModal(e);
  });
}

export function initAll(modals) {
  if (Array.isArray(modals) && modals.length > 0) {
    modals.forEach((modal) => {
      init(modal);
    });
  }
}
