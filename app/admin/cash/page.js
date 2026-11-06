'use client';
import PlaceholderPage from '../../components/PlaceholderPage';
import { BanknotesIcon } from '@heroicons/react/24/outline';

export default function CashPage() {
  return (
    <PlaceholderPage
      title="Cash Management"
      description="Track cash inflow and outflow across branches."
      icon={BanknotesIcon}
    />
  );
}