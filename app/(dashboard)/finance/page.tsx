import { Wallet } from "lucide-react";
import { ModulePage } from "@/components/shared/module-page";

export const metadata = { title: "Finance" };

export default function FinancePage() {
  return (
    <ModulePage
      title="Finance"
      description="A clear view of money, when you’re ready for it."
      icon={Wallet}
      emptyTitle="Finance isn’t open yet"
      emptyDescription="Accounts, budgets, and reports will live here. No placeholder numbers in the meantime."
      isEmpty
    />
  );
}
