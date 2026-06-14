import { SetMetadata } from '@nestjs/common';

export const SUBSCRIPTION_TIERS_KEY = 'subscription_tiers';
export const SubscriptionTiers = (...tiers: string[]) => SetMetadata(SUBSCRIPTION_TIERS_KEY, tiers);
