import prisma from "../lib/prisma";

export interface GuardianAlert {
  type: "INACTIVITY";
  message: string;
  daysSinceLastActivity: number;
}

/**
 * Checks if the user has been inactive (no trades) for more than 7 days.
 * Returns an alert if so, or null if activity is recent.
 */
export async function checkInactivity(
  userId: string
): Promise<GuardianAlert | null> {
  const lastTrade = await prisma.trade.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const lastActivity = await prisma.activityLog.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  // Use whichever is more recent: last trade or last activity log entry
  const lastDate = [lastTrade?.createdAt, lastActivity?.createdAt]
    .filter(Boolean)
    .sort((a, b) => b!.getTime() - a!.getTime())[0];

  if (!lastDate) {
    // No activity at all; check account creation date
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    if (!user) return null;

    const daysSinceCreation = daysBetween(user.createdAt, new Date());
    if (daysSinceCreation > 7) {
      return {
        type: "INACTIVITY",
        message:
          "You created your account but haven't made any trades yet. Consider setting up an agent to start trading.",
        daysSinceLastActivity: daysSinceCreation,
      };
    }

    return null;
  }

  const daysSince = daysBetween(lastDate, new Date());

  if (daysSince > 7) {
    return {
      type: "INACTIVITY",
      message: `No trading activity detected in ${daysSince} days. Your agents may need attention.`,
      daysSinceLastActivity: daysSince,
    };
  }

  return null;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
