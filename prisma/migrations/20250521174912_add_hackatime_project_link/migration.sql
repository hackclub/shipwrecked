-- CreateTable
CREATE TABLE "HackatimeProjectLink" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectID" TEXT NOT NULL,
    "hackatimeName" TEXT NOT NULL,
    "rawHours" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "HackatimeProjectLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HackatimeProjectLink_projectID_idx" ON "HackatimeProjectLink"("projectID");

-- CreateIndex
CREATE UNIQUE INDEX "HackatimeProjectLink_projectID_hackatimeName_key" ON "HackatimeProjectLink"("projectID", "hackatimeName");

-- AddForeignKey
ALTER TABLE "HackatimeProjectLink" ADD CONSTRAINT "HackatimeProjectLink_projectID_fkey" FOREIGN KEY ("projectID") REFERENCES "Project"("projectID") ON DELETE CASCADE ON UPDATE CASCADE;
