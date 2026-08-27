import { CartLinesUpdateEvent, CartErrorEvent } from '@shopify/events';

/**
 * Adds every variant listed in [data-pc-bundle-add]'s data-variant-ids to the
 * cart in a single request and opens the cart drawer — mirrors the add flow
 * in assets/product-form.js (same CartLinesUpdateEvent contract) so the
 * drawer, cart count, and line-item list all update the normal way. Never
 * navigates to /cart, per the design system's cart rules.
 */
function pcRefreshCart() {
  return fetch(`${Theme.routes.cart_url}.json`, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  }).then((response) => {
    if (!response.ok) throw new Error(`Failed to fetch cart: ${response.status}`);
    return response.json();
  });
}

function pcInitBundleAdd() {
  const button = document.querySelector('[data-pc-bundle-add]');
  if (!button) return;

  const originalLabel = button.textContent;

  button.addEventListener('click', async () => {
    const variantIds = (button.dataset.variantIds || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (variantIds.length === 0) return;

    button.disabled = true;
    button.textContent = 'Adding…';

    const items = variantIds.map((id) => ({ id: Number(id), quantity: 1 }));
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    const sectionIds = [];
    document.querySelectorAll('cart-items-component').forEach((component) => {
      if (component instanceof HTMLElement && component.dataset.sectionId) {
        sectionIds.push(component.dataset.sectionId);
      }
    });

    const deferred = CartLinesUpdateEvent.createPromise();

    document.dispatchEvent(
      new CartLinesUpdateEvent({
        action: 'add',
        context: 'product',
        lines: items.map((item) => ({ merchandiseId: String(item.id), quantity: item.quantity })),
        promise: deferred.promise,
      })
    );

    try {
      const response = await fetch(Theme.routes.cart_add_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items, sections: sectionIds.join(',') }),
      }).then((res) => res.json());

      if (response.status) {
        throw new Error(response.message || 'Add to cart failed');
      }

      const cart = await pcRefreshCart();
      deferred.resolve({
        cart: CartLinesUpdateEvent.createCartFromAjaxResponse(cart),
        detail: {
          items: cart.items,
          source: 'pc-bundle',
          sourceId: 'pc-bundle-add',
          itemCount: totalQuantity,
          didError: false,
        },
      });

      button.textContent = 'Added to cart';
      setTimeout(() => {
        button.textContent = originalLabel;
        button.disabled = false;
      }, 1800);
    } catch (error) {
      console.error(error);
      deferred.reject(error);
      document.dispatchEvent(
        new CartErrorEvent({
          error: error instanceof Error ? error.message : 'Network error during add to cart',
          code: 'SERVICE_UNAVAILABLE',
        })
      );
      button.textContent = originalLabel;
      button.disabled = false;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', pcInitBundleAdd);
} else {
  pcInitBundleAdd();
}
