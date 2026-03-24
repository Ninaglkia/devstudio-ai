const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Map product names to Stripe Price IDs (update these with real IDs)
const PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER,
  business: process.env.STRIPE_PRICE_BUSINESS,
  premium: process.env.STRIPE_PRICE_PREMIUM,
  manutenzione_mensile: process.env.STRIPE_PRICE_MANUTENZIONE_MENSILE,
  manutenzione_annuale: process.env.STRIPE_PRICE_MANUTENZIONE_ANNUALE,
};

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, addManutenzione, manutenzionePeriod } = req.body;

    if (!plan || !PRICES[plan]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const lineItems = [
      { price: PRICES[plan], quantity: 1 },
    ];

    // Add manutenzione if requested
    if (addManutenzione) {
      const manKey = manutenzionePeriod === 'annuale' ? 'manutenzione_annuale' : 'manutenzione_mensile';
      if (PRICES[manKey]) {
        lineItems.push({ price: PRICES[manKey], quantity: 1 });
      }
    }

    // Determine mode: if any item is recurring, use 'subscription'
    const hasRecurring = addManutenzione;
    const mode = hasRecurring ? 'subscription' : 'payment';

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: lineItems,
      success_url: `${req.headers.origin || 'https://devstudio-ai-delta.vercel.app'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'https://devstudio-ai-delta.vercel.app'}/#prezzi`,
      locale: 'it',
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
