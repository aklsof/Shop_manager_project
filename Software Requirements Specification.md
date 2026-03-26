# Software Requirements Specification
## Hybrid Store Management System

| Field | Details |
|---|---|
| **Version** | 2.0 |
| **Prepared by** | Sofiane Akli |
| **Date Created** | December 05, 2025 |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Features](#3-system-features)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [Other Nonfunctional Requirements](#5-other-nonfunctional-requirements)
6. [References](#6-references)
7. [Appendix A: Glossary](#7-appendix-a-glossary)

---

## 1. Introduction

### 1.1 Purpose

The purpose of this document is to define the software requirements for the Hybrid Store Management System, Version 2.0. This specification details the functional and non-functional requirements for a dual-interface retail solution that integrates a physical Point of Sale (POS) register with a customer-facing web application. This document is intended for the software development team, project managers, and system testers.

Version 2.0 finalizes the operational scope by adding a comprehensive glossary to disambiguate technical and business terms, ensuring clear communication across the project lifecycle.

### 1.2 Document Conventions

This document adheres to standard IEEE 830 formatting guidelines for software requirements specifications. Priority for higher-level requirements is assumed to be higher than detailed requirements.

### 1.3 Intended Audience

This document is intended for:

- **Developers** responsible for implementing the Python backend logic and TypeScript frontend interfaces.
- **Database administrators** managing the XAMPP MySQL environment.
- **Project stakeholders** who need to verify that the system scope meets the business needs of the store.

> [!NOTE]
> Readers should begin with the Overall Description to understand the system architecture before proceeding to the specific System Features section. Particular attention should be paid to the new [Appendix A: Glossary](#7-appendix-a-glossary) for definitions of key terms like 'FIFO' and 'Shrinkage.'

### 1.4 Project Scope

The Hybrid Store Management System is a retail software solution designed to bridge the gap between in-store operations and remote customer browsing. The software consists of:

- A **desktop-based register application** developed in **Python** that handles direct product selling and inventory updates.
- A **web-based application** developed in **TypeScript** that allows clients to browse products and administrators to manage stock.

Both applications communicate with a centralized local MySQL database hosted on an XAMPP server.

The scope includes:
- Accurate profit tracking via FIFO inventory consumption.
- Modern localized tax calculations.
- A secure authentication system for different user roles: **Admin**, **Employee**, and **Client**.

---

## 2. Overall Description

### 2.1 Product Perspective

This product is a new, self-contained system designed to replace manual inventory tracking and disconnected sales processes. It functions as a **client-server architecture** where:

- The **'server' component** is the local MySQL database managed by XAMPP.
- The **Python application** acts as a thick client for store staff.
- The **TypeScript website** acts as a thin client for both customers and administrators.

The system relies heavily on the availability of the local network to maintain the connection between the register, the web server, and the database.

### 2.2 Product Features

The system provides six distinct feature sets based on the user role and interface:

| # | Feature | Interface | Description |
|---|---|---|---|
| 1 | Sales & Refund Operations | Python Register | Allows authenticated store employees to process transactions, manage web orders, and handle refunds. |
| 2 | Customer Portal | TypeScript Website | Allows clients to browse categories, see current active deals, and reserve items. |
| 3 | Inventory Management | TypeScript Website – Admin Area | Allows administrators to receive new stock, manage 'lots,' and monitor stock levels via alerts. |
| 4 | User Administration | TypeScript Website – Admin Area | Allows administrators to create and manage staff accounts and roles. |
| 5 | Operational Management | Admin & POS | Includes stock adjustments for shrinkage and granular tax class management. |
| 6 | Financial Analytics | TypeScript Website – Admin Area | Generates detailed reports on revenue, cost, and profit. |

### 2.3 User Classes and Characteristics

| User Class | Description |
|---|---|
| **Store Associate** | Operates the Python register; requires authentication. Relies on the system to manage the queue of web orders and process sales/refunds accurately. |
| **Client** | A remote user accessing the website; requires general web browsing skills. Expects a clean, intuitive interface available in their native language. |
| **Administrator** | A power user accessing the secured backend. Responsible for data entry, defining cost structures, creating tax categories, managing staff access, and analyzing financial health. |

### 2.4 Operating Environment

- **Central database & web server:** Host machine running XAMPP (Apache and MySQL) on Windows or Linux.
- **Python Register:** Requires a Python 3.x interpreter and necessary database connector libraries (e.g., `mysql-connector-python`).
- **TypeScript Website:** Requires a modern web browser; served via the local server.

### 2.5 Design and Implementation Constraints

- The development is constrained by the requirement to use a **local MySQL server via XAMPP**.
- The database schema must be expanded to support `tax_categories`, `users` with role columns, and `inventory_adjustments`.
- The UI implementation is constrained by strict branding guidelines regarding color and title placement.
- Code must follow strict modular standards for testability.

### 2.6 Assumptions and Dependencies

- It is assumed that the host machine running XAMPP will remain powered on and connected to the local network during store hours.
- It is assumed that the `mysqldump` utility is available in the system path for backups.

---

## 3. System Features

### 3.1 Feature: Python Point of Sale (Register)

This feature encompasses the functionality for store staff to complete sales, manage orders, and handle returns.

#### 3.1.1 Description and Priority

> **Priority: HIGH** — The register is the central hub for daily operations, requiring security and efficiency.

#### 3.1.2 Stimulus/Response Sequences

| Stimulus | Response |
|---|---|
| User enters credentials | System validates against DB → Access granted based on Role |
| System polls DB | Dashboard updates → User marks 'Ready' → Status updates |

#### 3.1.3 Functional Requirements

| Requirement ID | Description |
|---|---|
| **REQ-3** (Dynamic Price Calculation) | The system shall calculate the selling price by checking for active records in the `price_rules` table. |
| **REQ-35** (Itemized Tax Calculation) | The system shall calculate the final transaction total by retrieving the specific `tax_category_rate` associated with each individual product in the cart. |
| **REQ-4** (FIFO Implementation) | The system shall decrease inventory by identifying the specific `lot_id` associated with the product that has the earliest `date_received`. |
| **REQ-25** (Refund Mode) | The Python Register shall provide a 'Refund Mode' accessible to Store Associates. When a product is scanned in this mode, the system shall treat the transaction quantity as negative. |
| **REQ-26** (Refund Inventory Logic) | Upon processing a refund, the system shall automatically increment the inventory count for that product into a new lot. |
| **REQ-34** (Web Order Management) | The Python Register shall include a 'Web Orders Dashboard' that polls the database for new pickup orders every **30 seconds**. Store Associates shall be able to view order details and update the order status through a defined workflow: **Pending → Ready for Pickup → Completed**. |
| **REQ-28** (Receipt Generation) | The system shall generate a digital receipt for every completed transaction, utilizing the 'AKLI' branding and defined language. |

---

### 3.2 Feature: Web-Based Client Portal

This feature encompasses the functionality for customers to interact with the store inventory remotely.

#### 3.2.1 Description and Priority

> **Priority: MEDIUM** — Enhances customer experience by allowing inventory browsing and pickup scheduling.

#### 3.2.2 Stimulus/Response Sequences

Client logs in → Selects Category → Views Product → Adds to Pickup.

#### 3.2.3 Functional Requirements

| Requirement ID | Description |
|---|---|
| **REQ-1** (Product Browsing) | The website shall display products categorized by: *All*, *Cigarettes*, *Drinks*, and *Snacks*. |
| **REQ-32** (Language Localization) | The system shall provide an **Arabic interface** option for the client-facing website. |
| **REQ-2** (Pickup Reservation) | The system shall allow clients to submit a cart as a 'Pickup Order' which stores the data in the `orders` table for POS retrieval. |

---

### 3.3 Feature: Administrative Content Management

This feature enables the Administrator to manage the inflow of goods, tax settings, staff access, and inventory health.

#### 3.3.1 Description and Priority

> **Priority: HIGH** — Essential for financial accuracy, security, and compliance.

#### 3.3.2 Stimulus/Response Sequences

| Stimulus | Response |
|---|---|
| Admin logs in → Selects 'Users' | Creates new account → Assigns 'Store Associate' role |
| Admin selects 'Settings' | Sets Tax Rate |

#### 3.3.3 Functional Requirements

| Requirement ID | Description |
|---|---|
| **REQ-9** | The system shall provide a secured login page restricted to users with the 'Administrator' role. |
| **REQ-37** (User Account Administration) | The Administrative Web Portal shall provide a 'User Management' module that allows the Administrator to create new user accounts, assign specific roles, and reset passwords for existing users. |
| **REQ-10** (Product Definition with Tax) | The system shall allow the Administrator to define a new product with details: Name, Category, Default Selling Price, Store Location, Tax Category, and Minimum Stock Threshold. |
| **REQ-11** (Stock Receipt) | The system shall allow the Administrator to add stock to a product by inputting the Buying Price and Quantity. |
| **REQ-12** (Lot Creation) | The system shall generate a new unique `lot_id` stamped with the current timestamp for every stock addition. |
| **REQ-33** (Inventory Adjustment) | The Administrative Web Portal and Python Register shall provide a 'Stock Adjustment' feature allowing authorized users to manually increment or decrement inventory levels for specific lots (e.g., for 'Damaged' goods). |
| **REQ-16** (Price Rule Creation) | The system shall allow the Administrator to create pricing rules: *Deal*, *Rollback*, *Clearance*, *Holiday*. |
| **REQ-27** (Financial Reports) | The Administrative Web Portal shall include a 'Financial Reports' section covering Revenue, COGS, and Net Profit. |

---

## 4. External Interface Requirements

### 4.1 User Interfaces

The user interface design must adhere to strict branding and usability standards.

| Requirement ID | Requirement |
|---|---|
| **REQ-19** (Naming Convention) | Python App: **'AKLI shopping manager'** / Web App: **'AKLI shopping website'** |
| **REQ-20** (Color Palette) | Red, White, and Green |
| **REQ-21** (Title Placement) | Top-left for windows; Top-middle for sign-in |
| **REQ-22** (Design Aesthetic) | Modern, Clean, Intuitive |

### 4.2 Hardware Interfaces

The system must interact with standard peripherals, including mouse, keyboard, and an optional barcode scanner. The host machine requires a stable power source.

### 4.3 Software Interfaces

| Interface | Details |
|---|---|
| **MySQL Database** | Schema must include: `users` (with role fields), `tax_categories`, `inventory_adjustments` |
| **Python** | Uses `mysql-connector` library |
| **TypeScript** | Uses RESTful API endpoints |

### 4.4 Communications Interfaces

| Protocol | Port | Purpose |
|---|---|---|
| TCP/IP | 3306 | Database communication |
| HTTP/HTTPS | 80 / 443 | Web application access |

---

## 5. Other Nonfunctional Requirements

### 5.1 Performance Requirements

The database query for retrieving a product price must be optimized to return in **under 0.5 seconds**.

### 5.2 Security Requirements

| Requirement ID | Description |
|---|---|
| **REQ-14** (Password Policy) | Minimum 8 characters, 1 Uppercase, 1 Lowercase, 1 Number. |
| **REQ-15** (Data Protection) | Passwords hashed using **bcrypt**. Buying prices hidden from non-admin users. |
| **REQ-29** (Automated Backup) | Scheduled `mysqldump` every **24 hours**. |

### 5.3 Software Quality Attributes

| Attribute | Description |
|---|---|
| **Correctness** | Prices switch exactly at `00:00:00` on the Start Date of a pricing rule. |
| **REQ-30** (Code Quality) | The code should be clean, easy to read, and modular, responding to development standards. |
| **REQ-31** (Testing) | Tests should be applied effectively in unit and system tests. |

---

## 6. References

- Apache Friends. (n.d.). *XAMPP for Windows and Linux*. Retrieved from https://www.apachefriends.org/
- Dennis, A., Wixom, B. H., & Tegarden, D. (2015). *Systems Analysis and Design: An Object-Oriented Approach with UML* (5th ed.). Wiley.
- Hoffer, J. A., George, J. F., & Valacich, J. S. (2017). *Modern Systems Analysis and Design* (8th ed.). Pearson.
- Microsoft. (n.d.). *TypeScript Documentation*. Retrieved from https://www.typescriptlang.org/docs/
- Pfleeger, S. L., & Atlee, J. M. (2009). *Software Engineering: Theory and Practice* (4th ed.). Pearson.
- Python Software Foundation. (n.d.). *Python Language Reference*. Retrieved from https://www.python.org/
- Romney, M. B., & Steinbart, P. J. (2018). *Accounting Information Systems* (14th ed.). Pearson.
- Sommerville, I. (2015). *Software Engineering* (10th ed.). Pearson.
- Stephens, R. (2015). *Beginning Software Engineering*. Wrox.
- Wiegers, K. E. (2002). *Software Requirements Specification Template*. Process Impact.

---

## 7. Appendix A: Glossary

| Term | Definition |
|---|---|
| **COGS** (Cost of Goods Sold) | The direct costs attributable to the production of the goods sold. Calculated here using the FIFO method based on specific inventory lots. |
| **FIFO** (First-In-First-Out) | An inventory management method where the assets produced or acquired first are recorded as sold first. Essential for accurate profit calculation. |
| **Lot** | A batch of a specific product received on a certain date at a specific buying price. Tracking lots allows the system to manage varying costs for the same item. |
| **POS** (Point of Sale) | The physical location and associated software (Python Register) where sales transactions are conducted. |
| **RBAC** (Role-Based Access Control) | A method of restricting system access to authorized users based on their role (e.g., Administrator vs. Store Associate). |
| **Shrinkage** | The loss of inventory that can be attributed to factors such as theft, damage, or administrative error. |
| **Store Associate** | An employee responsible for operating the POS register, processing sales and refunds, and fulfilling web orders. |
| **Thick Client** | A software application (Python Register) that processes logic locally on the machine, independent of a web browser. |
| **Thin Client** | A lightweight application (TypeScript Website) that relies heavily on the server for processing and is accessed via a web browser. |
| **XAMPP** | A free and open-source cross-platform web server solution stack package consisting mainly of the Apache HTTP Server and MySQL database. |
