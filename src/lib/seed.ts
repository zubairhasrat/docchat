/**
 * Sample knowledge base for the demo: the help center of "Brightdesk",
 * a fictional customer-support SaaS. Replace or extend it by uploading
 * your own PDFs, Markdown files or URLs in the app.
 */
export interface SeedDoc {
  title: string;
  source: string;
  text: string;
}

export const SEED_DOCS: SeedDoc[] = [
  {
    title: "Plans and billing",
    source: "help/billing.md",
    text: `Brightdesk offers three plans: Starter, Team and Business.

Starter costs $19 per agent per month and includes email support channels, up to 3 agents and 1 knowledge base.

Team costs $49 per agent per month. It adds live chat, unlimited agents, automation rules, and 5 knowledge bases.

Business costs $89 per agent per month. It adds SAML single sign-on (SSO), audit logs, custom data retention, a 99.9% uptime SLA and a dedicated success manager.

Annual billing gives a 20% discount on every plan. Invoices are issued on the first day of each billing period and can be downloaded from Settings > Billing > Invoices.

You can upgrade at any time; the price difference is prorated to the day. Downgrades take effect at the end of the current billing period. If you remove agents mid-cycle, you receive account credit, not a refund, for the unused seats.

We accept Visa, Mastercard, American Express and, on annual Business plans, bank transfer. All prices exclude VAT and sales tax, which are added at checkout based on your billing address.`,
  },
  {
    title: "Free trial and cancellation",
    source: "help/trial-and-cancellation.md",
    text: `Every new workspace starts with a 14-day free trial of the Team plan. No credit card is required to start a trial.

When the trial ends, the workspace becomes read-only until you choose a plan. Your tickets, contacts and knowledge base articles are kept for 30 days after the trial ends, then permanently deleted.

You can cancel a paid subscription at any time from Settings > Billing > Cancel subscription. Cancellation takes effect at the end of the current billing period, and you keep full access until then.

Refunds: monthly plans are not refunded. Annual plans cancelled within 30 days of purchase receive a full refund; after 30 days, annual plans are not refunded but remain active until the end of the term.

To delete your workspace and all data immediately, the account owner can go to Settings > Workspace > Delete workspace. Deletion is permanent and cannot be undone.`,
  },
  {
    title: "Single sign-on (SSO) setup",
    source: "help/sso.md",
    text: `SAML single sign-on is available on the Business plan. Brightdesk supports Okta, Microsoft Entra ID (Azure AD), Google Workspace and any SAML 2.0 identity provider.

To set up SSO:
1. Go to Settings > Security > Single sign-on and click Configure SAML.
2. Copy the Brightdesk ACS URL and Entity ID into your identity provider.
3. Upload your identity provider's metadata XML file, or paste the SSO URL and X.509 certificate.
4. Click Test connection. A successful test signs you in through your identity provider.
5. Turn on Enforce SSO to require all agents to sign in through SSO.

When SSO is enforced, password sign-in is disabled for agents. The account owner can always sign in with a password as a break-glass account.

SCIM user provisioning is available on Business plans for Okta and Entra ID. With SCIM, agents are created and deactivated automatically when they are assigned or removed in your identity provider.`,
  },
  {
    title: "Integrations",
    source: "help/integrations.md",
    text: `Brightdesk integrates with Slack, Shopify, Stripe, HubSpot, Salesforce and Jira.

Slack: get notified about new or escalated tickets in a Slack channel, and reply to tickets directly from Slack threads. Available on Team and Business plans.

Shopify: agents see a customer's recent orders, order status and tracking links inside the ticket sidebar, and can issue refunds without leaving Brightdesk.

Stripe: shows a customer's subscription, invoices and payment status in the ticket sidebar.

HubSpot and Salesforce: two-way contact sync every 15 minutes. Business plan only.

Jira: create a Jira issue from a ticket and see the issue status on the ticket.

REST API and webhooks: available on all plans. The API rate limit is 100 requests per minute on Starter, 400 on Team and 1,000 on Business. Webhooks can fire on ticket created, ticket updated, ticket solved and customer satisfaction rating received.`,
  },
  {
    title: "Data retention, security and privacy",
    source: "help/security.md",
    text: `Brightdesk is hosted on AWS in the United States (us-east-1) and the European Union (eu-central-1, Frankfurt). You choose the data region when you create a workspace; it cannot be changed later.

All data is encrypted in transit with TLS 1.2 or higher and at rest with AES-256. Backups are taken every 24 hours and kept for 35 days.

By default, tickets and attachments are kept for as long as your subscription is active. On the Business plan, admins can set a custom retention policy that automatically deletes closed tickets after 30, 90, 180 or 365 days.

Brightdesk is SOC 2 Type II certified and GDPR compliant. A Data Processing Agreement (DPA) can be signed from Settings > Legal. Customers can request an export of all their data in JSON format at any time.

Audit logs record sign-ins, permission changes, exports and deletions. They are available on the Business plan and kept for 1 year.`,
  },
  {
    title: "Automation rules and SLAs",
    source: "help/automations.md",
    text: `Automation rules run actions when a ticket matches conditions. Rules are available on Team and Business plans.

Common examples: assign tickets containing "refund" to the Billing group, set priority to Urgent for VIP customers, or auto-close tickets that have been pending for 7 days.

Each workspace can have up to 50 active rules on Team and unlimited rules on Business. Rules run in order from top to bottom; drag rules to change the order.

SLA policies set first-response and resolution targets by priority. For example: Urgent tickets need a first response within 1 hour and resolution within 8 hours. Tickets that are about to breach an SLA are highlighted in orange, and breached tickets in red.

Business hours: SLA timers only count time inside the business hours you define in Settings > Business hours. Holidays can be added so timers pause on those days.`,
  },
];
