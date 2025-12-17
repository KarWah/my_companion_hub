import { getActiveCompanion, updateCompanion } from "@/app/actions";
import { redirect } from "next/navigation";
import { CompanionForm } from "@/components/companion-form";

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

  const updateAction = updateCompanion.bind(null, companion.id);

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-white mb-8">Edit {companion.name}</h1>
      <CompanionForm
        action={updateAction}
        defaultValues={{
          name: companion.name,
          description: companion.description,
          visualDescription: companion.visualDescription,
          currentOutfit: companion.currentOutfit,
          userAppearance: companion.userAppearance || "",
          headerImage: companion.headerImage || "",
        }}
        submitLabel="Save Changes"
      />
    </div>
  );
}