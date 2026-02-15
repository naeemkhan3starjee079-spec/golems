export type Subscription = {
  id: string;
  service_name: string;
  amount: number | null;
  currency: string | null;
  frequency: string | null;
  status: string | null;
  first_seen: string | null;
  last_payment: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  amount: number | null;
  currency: string | null;
  paid_at: string | null;
  subscription_id: string | null;
};
