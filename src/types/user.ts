export interface IUser {
  id: string;
  username: string;
  imageUrl: string | null;
  name: string;
  email: string;
  password: string;
  hashedRefreshToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}
