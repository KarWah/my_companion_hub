// app/companion/new/page.tsx
import { createCompanion } from "@/app/actions"; // Your existing server action
import { CompanionWizard } from "@/components/wizard";

export default function NewCompanionPage() {
  return (
    <div className="min-h-screen text-white py-12 px-4">
       {/* You can keep your header here */}
       <h1 className="text-4xl font-black text-center mb-12 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">
         Companion Creator
       </h1>
       
       <CompanionWizard action={createCompanion} />
    </div>
  );
}