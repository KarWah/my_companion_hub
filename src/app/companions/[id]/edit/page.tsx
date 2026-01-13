import { getActiveCompanion, updateCompanion } from "@/app/actions";
import { redirect } from "next/navigation";
import { CompanionWizard } from "@/components/wizard";
import { parseCompanionToWizardState } from "@/lib/prompt-parser";

export default async function EditCompanionPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const companion = await getActiveCompanion(id);

  if (!companion) {
    redirect("/companions");
  }

  const wizardState = parseCompanionToWizardState(companion);
  const currentImage = companion.headerImageUrl || companion.headerImageLegacy || "";

  const updateAction = updateCompanion.bind(null, companion.id);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black text-white">
           Edit <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">{companion.name}</span>
        </h1>
        <a href="/companions" className="text-sm text-slate-500 hover:text-white transition-colors">
            Cancel & Exit
        </a>
      </div>
      
      <CompanionWizard
        action={updateAction}
        initialState={wizardState}
        initialImage={currentImage}
        mode="edit" // This triggers the Dashboard Layout
      />
    </div>
  );
}