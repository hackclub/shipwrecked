import ProgressBar from "@/components/common/ProgressBar";
import Prompt from "./prompt";
import { getServerSession } from "next-auth";
import { opts } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

// Slack Setup Page (/bay/intro/slack)
// Guides and confirms the registration of the users in the slack
export default async function Page() {
  const session = await getServerSession(opts);

  if (!session || !session?.user || !session.user.email) redirect("/bay/login");

  return (
    <>
      <div className="flex flex-col items-center justify-center h-[100vh] w-[100vw] bg-[url(/hut.webp)]">
        <img src="/logo-outline.svg" className="w-102 mb-4"></img>
        <div className="w-102">
          <ProgressBar
            value={25}
            variant="warning"
            className="border rounded border-gray-900/60"
          ></ProgressBar>
        </div>
        <Prompt email={session.user!.email!}></Prompt>
      </div>
    </>
  );
}
