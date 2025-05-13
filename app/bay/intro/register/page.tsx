import ProgressBar from "@/components/common/ProgressBar";
import { getServerSession } from "next-auth";
import { opts } from "@/app/api/auth/[...nextauth]/route";
import Form from "./form";

// Registration Page (/bay/intro/register)
// Guides the user to fill out a registration form
export default async function Page() {
  const session = await getServerSession(opts);

  return (
    <>
      <div className="flex flex-col items-center justify-center w-[100vw] bg-[url(/hut.webp)] bg-no-repeat bg-cover py-12">
        <img src="/logo-outline.svg" className="w-102 mb-4"></img>
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
