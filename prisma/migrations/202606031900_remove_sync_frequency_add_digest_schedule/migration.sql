ALTER TABLE "Project"
DROP COLUMN "syncFrequencyMinutes";

ALTER TABLE "ProjectSettings"
ADD COLUMN "dailyDigestSendHour" INTEGER NOT NULL DEFAULT 9,
ADD COLUMN "dailyDigestSendMinute" INTEGER NOT NULL DEFAULT 0;
