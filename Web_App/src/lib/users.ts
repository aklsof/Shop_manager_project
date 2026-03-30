/**
 * Represents users with properties matching the users table in the database.
 */

export interface IUsers {
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  preferred_lang?: string | null;
}

export class User implements IUsers {
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  preferred_lang?: string | null;

  constructor(
    userName: string,
    email: string,
    firstName: string,
    lastName: string,
    password: string | null = null,
    address: string | null = null,
    city: string | null = null,
    province: string | null = null,
    preferred_lang: string | null = null
  ) {
    this.userName = userName;
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.password = password;
    this.address = address;
    this.city = city;
    this.province = province;
    this.preferred_lang = preferred_lang;
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
