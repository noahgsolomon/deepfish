import { JoinForm } from "./_components/join-form";

export const dynamic = "force-dynamic";

export default function JoinPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="w-full max-w-md p-8">
        <h1 className="mb-6 text-center font-mono text-2xl font-bold text-white">
          JOIN DEEPFISH AI
        </h1>
        <JoinForm />
      </div>
    </div>
  );
}
