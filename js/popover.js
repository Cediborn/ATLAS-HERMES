// Atlas — Tiny shared popover behavior.
// One implementation for every trigger+panel dropdown (workspace switcher,
// notifications, profile menu) instead of three copies of the same logic.

export function createPopover({ trigger, panel, onOpenRender }) {
  function isOpen() {
    return !panel.hidden;
  }

  function open() {
    if (onOpenRender) onOpenRender();
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', onOutsideClick);
    document.addEventListener('keydown', onKeydown);
  }

  function close() {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onOutsideClick);
    document.removeEventListener('keydown', onKeydown);
  }

  function toggle() {
    if (isOpen()) close();
    else open();
  }

  function onOutsideClick(e) {
    if (!panel.contains(e.target) && e.target !== trigger && !trigger.contains(e.target)) {
      close();
    }
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      close();
      trigger.focus();
    }
  }

  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.addEventListener('click', toggle);

  return { open, close, toggle, isOpen };
}
