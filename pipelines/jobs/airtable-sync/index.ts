import Airtable, { FieldSet } from "airtable";
import { prisma } from "../../pipeline-prisma";
import * as dotenv from 'dotenv';

export async function syncAirtable() {
  dotenv.config();
  console.log("Loaded config")
  
  // only sync shipped projects
  const projects = await prisma.project.findMany({
    where: {
      shipped: true,
    },
    include: {
      reviews: {
        include: {
          reviewer: true,
        },
      },
      auditLogs: {
        include: {
          actorUser: true,
          targetUser: true,
        },
      },
      hackatimeLinks: true,
      user: true,
    },
  });

  const airtable = new Airtable({
    apiKey: process.env.UNIFIED_AIRTABLE_API_KEY,
  });
  const base = airtable.base(process.env.UNIFIED_AIRTABLE_BASE_ID || "");
  const table = base("Approved Projects");
  for (const project of projects) {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: project.userId,
        },
      });
      const response = await fetch(
        `${process.env.IDENTITY_URL}/api/v1/me`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${user?.identityToken}`,
          },
        },
      );
      const hackatimeProjects = await prisma.hackatimeProjectLink.findMany({
        where: {
          projectID: project.projectID,
        },
      });
      const sumOfApprovedHours = hackatimeProjects.reduce(
        (acc, project) => acc + (project?.hoursOverride || 0),
        0,
      );
      let identityInfoJson;
      try {
        identityInfoJson = await response.json();
        identityInfoJson = identityInfoJson.identity;
      } catch (error) {
        console.error(`Failed to parse identity response for user ${user?.name}:`, error);
        continue;
      }

      // if identity is verified, set status to L1 in postgres
      if (
        identityInfoJson?.verification_status == "verified" &&
        user?.status != "FraudSuspect" && user?.status != "L1"
      ) {
        console.log(`updating user ${user?.name} to L1`)
        await prisma.user.update({
          where: {
            id: user?.id,
          },
          data: {
            status: "L1",
          },
        });
      }

      // if identity isn't verified/found, skip
      if (
        !identityInfoJson ||
        user?.status == "FraudSuspect" ||
        identityInfoJson.verification_status != "verified"
      ) {
        continue;
      }
      const reviewers = project.reviews.filter((review) => review.reviewer.name != user?.name).map((review) => `Name: ${review.reviewer.name} Email: ${review.reviewer.email} Slack ID: ${review.reviewer.slack}`).join("\n")
      const overrideHoursSpentJustification = 
      `This project was reviewed by the following people:

${reviewers}

Hackatime Project Link(s):
${hackatimeProjects.map(() => `https://hackatime.hackclub.com/admin/timeline?user_ids=${user?.hackatimeId}`).join("\n")}

Hackatime ID: ${user?.hackatimeId}
GitHub Repository: ${project.codeUrl}
${project.viral ? "\nThis project was also marked as viral.\n" : ""}

Audit Log Timeline:
${project.auditLogs.map((log) => `- Actor: ${log.actorUser?.name}, Event: ${log.eventType}, At: ${log.createdAt}`).join("\n")}

Comments:
${project.reviews.map((review) => `- User: ${review.reviewer.name}, Comment: ${review.comment}, At: ${review.createdAt}`).join("\n\n")}
`;

      const fields: FieldSet = {
        Email: user?.email,
        "Address (Line 1)": identityInfoJson.addresses[0].line_1,
        "Address (Line 2)": identityInfoJson.addresses[0].line_2
          ? identityInfoJson.addresses[0].line_2
          : "",
        City: identityInfoJson.addresses[0].city,
        Country: identityInfoJson.addresses[0].country,
        "State / Province": identityInfoJson.addresses[0].state
          ? identityInfoJson.addresses[0].state
          : "",
        "ZIP / Postal Code": identityInfoJson.addresses[0].postal_code
          ? identityInfoJson.addresses[0].postal_code
          : "",
        "Code URL": project.codeUrl,
        Birthday: identityInfoJson.birthday,
        "First Name": identityInfoJson.first_name,
        "Last Name": identityInfoJson.last_name,
        Description: project.description,
        "Override Hours Spent": sumOfApprovedHours,
        "Override Hours Spent Justification": overrideHoursSpentJustification,
        YSWS: ["recifGNo59RU3o6TH"],
        "Playable URL": project.playableUrl,
        Screenshot: [
          {
            url: project.screenshot,
          } as any,
        ],
      };

      if (project.airtableId) {
        // Update existing record
        try {
          await table.update([
            {
              id: project.airtableId,
              fields,
            },
          ]);
        } catch (error) {
          console.error(`Failed to update Airtable record for project ${project.name}:`, error);
        }
      } else {
        // Create new/update record
        await table.create(
          [
            {
              fields,
            },
          ],
          async function (err: Error | null, records: any) {
            if (err) {
              console.error(err);
              return;
            }
            for (const record of records) {
              try {
                await prisma.project.update({
                  where: {
                    projectID: project.projectID,
                  },
                  data: {
                    airtableId: record.getId(),
                  },
                });
                console.log(`created Airtable record ${record.getId()}, project name: ${project?.name}`)
              } catch (error) {
                console.error(`Failed to update project with Airtable ID for project ${project.name}:`, error);
              }
            }
          },
        );
      }

    } catch (error) {
      console.error(error);
    }
  }
  const records = (await table.select().all()).filter((record) => record.fields.ID?.toString().includes("Shipwrecked"))
  for (const record of records) {
    const project = await prisma.project.findFirst({
      where: {
        airtableId: record.getId(),
      },
    });
    if (!project?.shipped && project) {
        await table.destroy([record.getId()])
        console.log(`destroying Airtable record ${record.getId()}, project name: ${project?.name}`)
    }
  }
  for (const record of records) {
    const project = await prisma.project.findFirst({
      where: {
        airtableId: record.getId(),
      },
    });
    if (!project) {
      try {
        await record.destroy()
        console.log(`destroying Airtable record ${record.getId()}`)
      } catch (error) {
        console.error(error)
      }
    }
  }
}

async function main() {
  try {
    await syncAirtable();
  } catch (error) {
    console.error('Fatal error in syncAirtable:', error);
    process.exit(1);
  }
}

main();