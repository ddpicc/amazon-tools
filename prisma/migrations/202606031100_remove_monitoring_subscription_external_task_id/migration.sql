DROP INDEX IF EXISTS "MonitoringSubscription_type_externalTaskId_key";

ALTER TABLE "MonitoringSubscription"
DROP COLUMN "externalTaskId";
