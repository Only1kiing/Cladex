import prisma from "../lib/prisma";

export async function processSubscriptionBilling() {
  const now = new Date();

  // Find all agents with active subscriptions due for billing
  const dueAgents = await prisma.agent.findMany({
    where: {
      subscriptionStatus: "active",
      subscriptionPrice: { not: null },
      nextBillingDate: { lte: now },
    },
    include: {
      user: { select: { id: true, gasBalance: true } },
    },
  });

  if (dueAgents.length === 0) return;

  console.log(`[Billing] Processing ${dueAgents.length} subscription(s) due`);

  for (const agent of dueAgents) {
    const price = agent.subscriptionPrice!;
    const user = agent.user;

    // Use interactive transaction to atomically re-check balance and deduct
    try {
      await prisma.$transaction(async (tx) => {
        const freshUser = await tx.user.findUnique({
          where: { id: user.id },
          select: { gasBalance: true },
        });

        if (!freshUser || freshUser.gasBalance < price) {
          throw new Error("INSUFFICIENT_GAS");
        }

        const nextDate = new Date(agent.nextBillingDate!);
        nextDate.setDate(nextDate.getDate() + 30);

        await tx.user.update({
          where: { id: user.id },
          data: { gasBalance: { decrement: price } },
        });
        await tx.agent.update({
          where: { id: agent.id },
          data: { nextBillingDate: nextDate },
        });
        await tx.activityLog.create({
          data: {
            userId: user.id,
            agentId: agent.id,
            type: "INSIGHT",
            message: `Subscription renewed for "${agent.name}": -$${price.toFixed(2)} from gas balance`,
          },
        });
      });

      console.log(`[Billing] Renewed "${agent.name}" for user ${user.id} — $${price.toFixed(2)}`);
    } catch (err: any) {
      if (err?.message === "INSUFFICIENT_GAS") {
        // Insufficient gas — pause agent
        await prisma.$transaction([
          prisma.agent.update({
            where: { id: agent.id },
            data: {
              subscriptionStatus: "paused_no_gas",
              status: "PAUSED",
            },
          }),
          prisma.activityLog.create({
            data: {
              userId: user.id,
              agentId: agent.id,
              type: "ALERT",
              message: `Agent "${agent.name}" paused — insufficient gas for $${price.toFixed(2)} subscription. Top up to resume.`,
            },
          }),
        ]);

        console.log(`[Billing] Paused "${agent.name}" for user ${user.id} — insufficient gas ($${user.gasBalance.toFixed(2)} < $${price.toFixed(2)})`);
      } else {
        throw err;
      }
    }
  }
}
