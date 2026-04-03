import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Stripe init — only active if STRIPE_SECRET_KEY is set
function getStripe(): any | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Stripe = require("stripe");
  return new Stripe(key);
}

// ---------------------------------------------------------------------------
// Webhook — Stripe sends payment confirmations here (no auth)
// ---------------------------------------------------------------------------

router.post("/webhook", async (req: Request, res: Response) => {
  const stripe = getStripe();
  if (!stripe) {
    res.status(503).json({ error: "Stripe not configured" });
    return;
  }

  const sig = req.headers["stripe-signature"] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !endpointSecret) {
    res.status(400).json({ error: "Missing webhook signature" });
    return;
  }

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(
      (req as any).rawBody || JSON.stringify(req.body),
      sig,
      endpointSecret
    );
  } catch (err: any) {
    console.error("[Stripe] Webhook signature failed:", err.message);
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const userId = session.metadata?.userId;
    const gasAmount = parseFloat(session.metadata?.gasAmount || "0");

    if (userId && gasAmount > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { gasBalance: { increment: gasAmount } },
      });

      await prisma.activityLog.create({
        data: {
          userId,
          type: "INSIGHT",
          message: `Gas topped up via Stripe: +$${gasAmount.toFixed(2)}`,
        },
      });

      console.log(`[Stripe] Gas topup: user ${userId} +$${gasAmount}`);
    }
  }

  res.json({ received: true });
});

// ---------------------------------------------------------------------------
// Authenticated endpoints
// ---------------------------------------------------------------------------

router.use(authMiddleware);

const topupSchema = z.object({
  amount: z.number().min(5).max(500),
});

// POST /api/billing/create-checkout — create Stripe Checkout session for gas topup
router.post("/create-checkout", async (req: Request, res: Response) => {
  const stripe = getStripe();
  if (!stripe) {
    res.status(503).json({ error: "Stripe payments not configured. Use SOL gas topup in Settings." });
    return;
  }

  try {
    const body = topupSchema.parse(req.body);
    const userId = req.user!.id;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Cladex Gas Topup — $${body.amount}`,
              description: "Trading gas balance for agent execution fees",
            },
            unit_amount: Math.round(body.amount * 100), // cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        userId,
        gasAmount: body.amount.toString(),
      },
      success_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/settings?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/settings?payment=cancelled`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid amount", details: err.errors });
      return;
    }
    console.error("[Stripe] Checkout error:", err);
    res.status(500).json({ error: "Failed to create payment session" });
  }
});

// GET /api/billing/status — check if Stripe is configured
router.get("/status", (_req: Request, res: Response) => {
  const stripe = getStripe();
  res.json({
    stripeEnabled: !!stripe,
    methods: stripe ? ["card", "sol"] : ["sol"],
  });
});

export default router;
