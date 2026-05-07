-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT NOT NULL,
    "certificationLevel" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawLeadSource" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "rawData" JSONB NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractorId" TEXT,

    CONSTRAINT "RawLeadSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadInsight" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "companyType" TEXT NOT NULL,
    "priorityScore" INTEGER NOT NULL,
    "talkingPoints" JSONB NOT NULL,
    "recommendedProducts" JSONB NOT NULL,
    "risks" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modelVersion" TEXT,
    "promptVersion" TEXT,

    CONSTRAINT "LeadInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_dedupeKey_key" ON "Contractor"("dedupeKey");

-- CreateIndex
CREATE INDEX "Contractor_zipCode_idx" ON "Contractor"("zipCode");

-- CreateIndex
CREATE INDEX "Contractor_phone_idx" ON "Contractor"("phone");

-- CreateIndex
CREATE INDEX "RawLeadSource_contractorId_idx" ON "RawLeadSource"("contractorId");

-- CreateIndex
CREATE INDEX "RawLeadSource_sourceName_scrapedAt_idx" ON "RawLeadSource"("sourceName", "scrapedAt");

-- CreateIndex
CREATE INDEX "LeadInsight_contractorId_generatedAt_idx" ON "LeadInsight"("contractorId", "generatedAt");

-- AddForeignKey
ALTER TABLE "RawLeadSource" ADD CONSTRAINT "RawLeadSource_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadInsight" ADD CONSTRAINT "LeadInsight_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
