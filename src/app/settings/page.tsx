import { getCompanions } from "@/app/actions";
import SettingsList from "@/components/settingsList";

export default async function SettingsPage() {
  const companions = await getCompanions();

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>
      <SettingsList companions={companions} />
    </div>
  );
}