import LoginOptions from "./options";

// Login Page (/bay/login)
export default async function Page() {
  return (
    <div className="fixed inset-0 bg-[url(/bay.webp)] bg-cover bg-center">
      <div className="flex flex-col items-center justify-center h-full">
        <img src="/logo.png" className="w-32 mb-8" alt="Shipwrecked Logo" />
        <LoginOptions />
      </div>
    </div>
  );
}
