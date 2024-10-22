import * as activities from './activities';
import { proxyActivities, sleep } from '@temporalio/workflow';
import type { NewsletterInput } from './lib/types';

const { sendEmail } = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 seconds',
  retry: { initialInterval: '5 seconds', backoffCoefficient: 1 },
});

// This is actually 1 second, for demo purposes
const DAY = 1000;

export async function Newsletter(input: NewsletterInput) {
  const { email } = input;

  await sendEmail({
    to: email,
    time: new Date().toTimeString(),
    subject: "Welcome to the newsletter",
    content: "Welcome to the newsletter, we are excited to have you on board..."
  });

  await sleep(5 * DAY);

  await sendEmail({
    to: email,
    time: new Date().toTimeString(),
    subject: "New feature announcement",
    content: "We are excited to announce a new feature that will be available to all our subscribers..."
  });

  await sleep(5 * DAY);

  await sendEmail({
    to: email,
    time: new Date().toTimeString(),
    subject: "Discount offer",
    content: "We are excited to offer you a discount on our premium subscription..."
  });
}