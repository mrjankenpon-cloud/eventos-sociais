/** Pré-carrega chunks do funil público de compra para reduzir espera entre rotas. */

export function prefetchEventDetails() {
  return import('../pages/public/EventDetails');
}

export function prefetchEventRegistration() {
  return import('../pages/public/EventRegistration');
}

export function prefetchOrderSuccess() {
  return import('../pages/public/OrderSuccess');
}

export function prefetchPurchaseFunnel() {
  return Promise.all([
    prefetchEventDetails(),
    prefetchEventRegistration(),
    prefetchOrderSuccess(),
  ]);
}
