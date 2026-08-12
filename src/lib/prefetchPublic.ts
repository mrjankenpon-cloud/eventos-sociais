/** Pré-carrega chunks ainda lazy do funil público. */

export function prefetchEventDetails() {
  // Eager em App.tsx — noop para manter API dos cards.
  return Promise.resolve();
}

export function prefetchEventRegistration() {
  // Eager em App.tsx — noop para manter API dos botões.
  return Promise.resolve();
}

export function prefetchOrderSuccess() {
  return import('../pages/public/OrderSuccess');
}

export function prefetchPurchaseFunnel() {
  return prefetchOrderSuccess();
}
