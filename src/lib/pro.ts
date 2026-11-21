/** UI Polish Pro: the price and where to buy it, shared by the sales page
 *  and every screen preview's bar. */

export const PRO_PRICE = "$299";

/** The Polar checkout, from PRO_CHECKOUT_URL. Without it, buying goes to
 *  the sales page's price section, which says how to get in touch. */
export const proCheckout = () => process.env.PRO_CHECKOUT_URL?.trim() || null;

/** Where each screen's live preview opens. Copper predates /screens/<name>. */
export const previewHref = (name: string) => (name === "copper" ? "/example" : `/screens/${name}`);
