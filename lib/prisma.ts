import { createPrismaAdapter } from '../lib/prisma-adapter';
import { PrismaClient } from '@/app/generated/prisma/client';
import metrics from '@/metrics';

export const prisma = new PrismaClient({ adapter: createPrismaAdapter() }).$extends({
  name: 'slackUserExtension',
  model: {
    user: {
      async slack(email: string) {
        return (
          await prisma.account.findFirst({
            where: {
              provider: 'slack',
              user: { email },
            },
            select: {
              providerAccountId: true,
            },
          })
        )?.providerAccountId;
      },
    },
  },
  query: {
    async $allOperations({ operation, model, args, query }) {
      const metricKey = `${operation}_${model}`;
      try {
        const start = performance.now();
        const queryResult = await query(args);
        const time = performance.now() - start;

        metrics.timing(metricKey, time);
        return queryResult;
      } catch (err) {
        metrics.increment(`errors.${metricKey}`, 1);
      }
      return;
    },
  },
});
