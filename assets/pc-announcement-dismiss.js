const PC_ANNOUNCEMENT_DISMISS_KEY = 'pc-announcement-dismissed';

function pcInitAnnouncementDismiss() {
  const bar = document.querySelector('.announcement-bar');
  const button = document.querySelector('[data-pc-announcement-dismiss]');
  if (!bar || !button) return;

  try {
    if (sessionStorage.getItem(PC_ANNOUNCEMENT_DISMISS_KEY) === '1') {
      // Already dismissed this session: remove before first paint settles,
      // no animation needed and nothing downstream has measured its height yet.
      bar.remove();
      return;
    }
  } catch (error) {
    // sessionStorage unavailable (private mode, etc.) - announcement just stays visible.
  }

  button.addEventListener('click', () => {
    // Animate the collapse (rather than an abrupt removal) so anything that
    // measures layout on resize — the sticky header among them — sees a
    // smooth height change instead of a sudden jump.
    const startHeight = bar.getBoundingClientRect().height;
    bar.style.maxHeight = `${startHeight}px`;
    bar.style.opacity = '1';

    // Force a reflow so the browser registers the starting height before we
    // transition to the collapsed state.
    void bar.offsetHeight;

    bar.style.maxHeight = '0px';
    bar.style.opacity = '0';
    bar.style.paddingBlock = '0px';

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      bar.remove();
      window.dispatchEvent(new Event('resize'));
    };

    bar.addEventListener('transitionend', finish, { once: true });
    // Fallback in case transitionend doesn't fire (e.g. reduced motion, or
    // the element becomes display:none via some other rule first).
    setTimeout(finish, 400);

    try {
      sessionStorage.setItem(PC_ANNOUNCEMENT_DISMISS_KEY, '1');
    } catch (error) {
      // Nothing to persist if storage isn't available; dismissal still works for this view.
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', pcInitAnnouncementDismiss);
} else {
  pcInitAnnouncementDismiss();
}
