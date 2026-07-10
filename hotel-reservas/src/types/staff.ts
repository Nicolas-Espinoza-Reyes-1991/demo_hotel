export type StaffRoleCode = "ADMIN" | "STAFF";

export type PublicStaffUser = {
  id: string;
  username: string;
  fullName: string | null;
  role: StaffRoleCode;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};
