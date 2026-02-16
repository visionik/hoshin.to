import { HoshinEditor } from "@/src/features/hoshin/hoshin-editor";

export const dynamic = "force-static";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-[1280px] p-4 md:p-6">
      <HoshinEditor />
    </main>
  );
}
