-- Create the UserRole enum type
CREATE TYPE "UserRole" AS ENUM ('User', 'Reviewer', 'Admin');

-- Add the role column with a default value of 'User'
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'User';

-- Update existing admin users to have the Admin role
UPDATE "User" SET "role" = 'Admin' WHERE "isAdmin" = true;

-- Once data is migrated, we can safely drop the isAdmin column
-- ALTER TABLE "User" DROP COLUMN "isAdmin";
-- (Uncomment this after verifying the migration worked correctly) 