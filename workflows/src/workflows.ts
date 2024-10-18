import * as activities from './activities';
import { proxyActivities, sleep } from '@temporalio/workflow';
import dedent from 'dedent';
import type { NewsletterInput } from './lib/types';

const STANDARD_RETRY = {
  maximumAttempts: Infinity,
  initialInterval: '5 seconds',
  backoffCoefficient: 1,
}

const NEVER_RETRY = {
  maximumAttempts: 1,
}

// This is actually 1 second, for demo purposes
const DAY = 1000;

export async function Newsletter(input: NewsletterInput): Promise<void> {
  const { email } = input;

  const { sendEmail } = proxyActivities<typeof activities>({
    startToCloseTimeout: '1 seconds',
    // This allows us to turn off Temporal magic for the demo
    retry: input.skipRetry ? NEVER_RETRY : STANDARD_RETRY,
  });

  await sendEmail({
    to: email,
    time: new Date().toTimeString(),
    subject: "Welcome to the newsletter",
    content: dedent`
      Welcome to the newsletter, we are excited to have you on board. Stay tuned for the latest updates and announcements.`
  });

  await sleep(5 * DAY);

  await sendEmail({
    to: email,
    time: new Date().toTimeString(),
    subject: "New feature announcement",
    content: dedent`
      We are excited to announce a new feature that will be available to all our subscribers. Stay tuned for more information.`
  });

  await sleep(5 * DAY);

  await sendEmail({
    to: email,
    time: new Date().toTimeString(),
    subject: "Discount offer",
    content: dedent`
      We are excited to offer you a discount on our premium subscription.
      This offer is only available for a limited time, so make sure to take advantage of it.`
  });
}