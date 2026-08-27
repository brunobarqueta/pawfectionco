import { CartLinesUpdateEvent, CartErrorEvent } from '@shopify/events';

/**
 * Pawfectionco quick-add: a single, self-contained "always add the default
 * variant" button used on bespoke product cards (snippets/pc-product-card.liquid).
 * Deliberately bypasses Horizon's quick-add-component/<product-card>
 * Add-vs-Choose branching (which opens a variant-picker modal for
 * multi-option products) — every card gets the same full-width pill that
 * adds product.selected_or_first_available_variant directly. Same
 * CartLinesUpdateEvent contract as assets/pc-bundle-add.js, so the cart
 * drawer, count, and line items all update the normal way; never navigates
 * to /cart.
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

async function pcHandleQuickAdd(button) {
  const variantId = button.dataset.variantId;
  if (!variantId) return;

  const label = button.querySelector('.pc-quick-add-button__label');
  const originalText = label ? label.textContent : '';
  const addedText = button.dataset.addedLabel || 'Added';

  button.disabled = true;
  button.classList.add('is-loading');

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
      lines: [{ merchandiseId: String(variantId), quantity: 1 }],
      promise: deferred.promise,
    })
  );

  try {
    const response = await fetch(Theme.routes.cart_add_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: Number(variantId), quantity: 1 }], sections: sectionIds.join(',') }),
    }).then((res) => res.json());

    if (response.status) {
      throw new Error(response.message || 'Add to cart failed');
    }

    const cart = await pcRefreshCart();
    deferred.resolve({
      cart: CartLinesUpdateEvent.createCartFromAjaxResponse(cart),
      detail: {
        items: cart.items,
        source: 'pc-quick-add',
        sourceId: variantId,
        itemCount: 1,
        didError: false,
      },
    });

    button.classList.remove('is-loading');
    button.classList.add('is-added');
    if (label) label.textContent = addedText;

    setTimeout(() => {
      button.classList.remove('is-added');
      button.disabled = false;
      if (label) label.textContent = originalText;
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
    button.disabled = false;
    button.classList.remove('is-loading');
  }
}

document.addEventListener('click', (event) => {
  const button = event.target instanceof Element ? event.target.closest('[data-pc-quick-add]') : null;
  if (!(button instanceof HTMLButtonElement) || button.disabled) return;
  pcHandleQuickAdd(button);
});
