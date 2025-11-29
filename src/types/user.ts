export interface IUser {
  id: string;
  username: string;
  email: string;
  password: string;
  hashedRefreshToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}
