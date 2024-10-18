export type Email = {
  to: string;
  time: string;
  subject: string;
  content: string;
};

export type EmailMsg = {
  email: Email;
}

export type ToggleEmailServiceMsg = {
  status: boolean;
}

export type RetryLevel = "none" | "workflow" | "temporal";

export type RetryLevelMsg = {
  level: RetryLevel;
}

export type NewsletterInput = {
  email: string;
  skipRetry?: boolean;
}
