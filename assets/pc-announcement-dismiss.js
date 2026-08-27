const PC_ANNOUNCEMENT_DISMISS_KEY = 'pc-announcement-dismissed';

function pcInitAnnouncementDismiss() {
  const bar = document.querySelector('.announcement-bar');
  const button = document.querySelector('[data-pc-announcement-dismiss]');
  if (!bar || !button) return;

  try {
    if (sessionStorage.getItem(PC_ANNOUNCEMENT_DISMISS_KEY) === '1') {
      bar.remove();
      return;
    }
  } catch (error) {
    // sessionStorage unavailable (private mode, etc.) - announcement just stays visible.
  }

  button.addEventListener('click', () => {
    bar.remove();
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
