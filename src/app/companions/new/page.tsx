import { createCompanion } from "@/app/actions";
import { CompanionForm } from "@/components/companion-form";

export default function NewCompanionPage() {
  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-white mb-8">Create Companion</h1>
      <CompanionForm action={createCompanion} submitLabel="Create Companion" />
    </div>
  );
}