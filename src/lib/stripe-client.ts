/**
 * Client-side utility functions for Stripe integration
 */

/**
 * Creates a checkout session for a subscription
 * @param price_id - The Stripe Price ID for the subscription
 * @returns The checkout session URL
 */
export async function createCheckoutSession(price_id: string): Promise<string> {
  const response = await fetch("/api/stripe/create-checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ price_id }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const { url } = await response.json();
  return url;
}

/**
 * Creates a customer portal session for managing subscriptions
 * @returns The portal session URL
 */
export async function createPortalSession(): Promise<string> {
  const response = await fetch("/api/stripe/create-portal", {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const { url } = await response.json();
  return url;
}

/**
 * Creates a checkout session for a one-time payment
 * @param price_id - The Stripe Price ID for the product
 * @param quantity - Optional quantity (defaults to 1)
 * @returns The checkout session URL
 */
export async function createPaymentCheckout(
  price_id: string,
  quantity: number = 1,
): Promise<string> {
  const response = await fetch("/api/stripe/create-payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ price_id, quantity }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const { url } = await response.json();
  return url;
}
