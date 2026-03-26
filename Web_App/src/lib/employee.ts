/**
 * TypeScript equivalent of include/employee.php
 * Represents an employee/user with properties matching the tbluser table.
 */

export interface IEmployee {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  address?: string | null;
  salary?: number | null;
  password?: string | null;
}

export class Employee implements IEmployee {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  address?: string | null;
  salary?: number | null;
  password?: string | null;

  constructor(
    email: string,
    firstName: string,
    lastName: string,
    phone: string | null = null,
    address: string | null = null,
    salary: number | null = null,
    password: string | null = null
  ) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.address = address;
    this.salary = salary;
    this.password = password;
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  getFormattedSalary(): string {
    if (this.salary !== null && this.salary !== undefined) {
      return '$' + this.salary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return 'N/A';
  }
}
