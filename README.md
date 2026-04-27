# Welcome to your Lovable project

## Paiement Stripe

Variables à configurer dans les secrets Supabase Edge Functions avant déploiement :

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PLUGIN_MONTHLY`
- `APP_URL`

Fonctions à déployer :

- `create-checkout-session`
- `create-portal-session`
- `stripe-webhook`

Webhook Stripe à brancher vers :

```text
https://<project-ref>.supabase.co/functions/v1/stripe-webhook
```

Événements Stripe utiles :

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
