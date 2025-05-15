import ProgressBar from "@/components/common/ProgressBar";
import { getServerSession } from "next-auth";
import { opts } from "@/app/api/auth/[...nextauth]/route";
import Form from "./form";

// Add dynamic directive at the top of the file after the imports
export const dynamic = 'force-dynamic';

// Registration Page (/bay/intro/register)
// Guides the user to fill out a registration form
export default async function Page() {
  const session = await getServerSession(opts);

  return (
    <>
      <div className="flex flex-col items-center justify-center w-[100vw] bg-[url(/hut.png)] bg-no-repeat bg-cover py-12">
        <img src="/logo-border.png" className="w-102 mb-4"></img>
        <div className="w-102">
          <ProgressBar
            value={75}
            variant="warning"
            className="border rounded border-gray-900/60"
          ></ProgressBar>
        </div>

        <Form
          hasSession={
            session != null &&
            session!.user != null &&
            session!.user!.email != null
          }
        ></Form>
      </div>
    </>
  );
}
