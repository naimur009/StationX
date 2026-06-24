# Project Overview

A web-based **Restaurant Management Dashboard** that allows a restaurant to run day-to-day operations from a single system — taking orders via POS, tracking sales and income, managing staff, vendors, products, expenses, and generating reports. The public-facing side is a simple home page; everything else lives behind an admin login.

---

# Users

| Role | Description |
|---|---|
| **Admin** | Full access to all modules. Manages users, permissions, and restaurant settings. |
| **Manager** | Operational access (scope to be defined via permissions in the User module). |
| **Employee / Staff** | Limited access, primarily POS, Orders, Tasks, Attendance (scope to be defined via permissions). |
| **Customer** | Not a system user — a data record stored for order history and contact purposes. |

> Note: Since Admin can configure "their access, what can he do, their permission, their role" per user, access control is **permission-based**, not just role-based. Each Manager/Employee account can have a custom set of allowed modules/actions.

---

# Features

## 1. Home Page (Public)
- Public landing page
- Navbar with **Admin Login** button
- Login redirects to the dashboard appropriate to the user's role/permissions

## 2. Authentication & Access Control
- Login (Admin, Manager, Employee)
- Session/token-based auth
- Role & permission-based route protection
- *(Open question: is "Forgot password" / password reset required for v1?)*

## 3. Dashboard (Overview)
- Key metrics: total earned, total products sold, total orders completed
- Date filter: **Today / This Week / This Month**
- Top 10 best-selling items, scoped to the same filter
- Quick-access buttons/shortcuts to other modules (POS, Orders, Tasks, etc.)

## 4. POS (Point of Sale)
- Create a new order
- Browse/select products for the order
- Adjust quantity per item
- Apply a discount coupon
- Calculate totals (subtotal, discount, tax if any, grand total)
- Generate and print/download a bill
- *(Open question: payment method tracking — cash/card/UPI/split? Table/order type — dine-in, takeaway, delivery?)*

## 5. Orders
- List of all orders generated from POS
- Order detail view (items, quantities, totals, coupon used, timestamp, created by)
- Edit order
- Delete order
- Search and filter orders (by date, status, staff, customer)
- *(Open question: should an order have a status — Pending / Completed / Cancelled?)*

## 6. Coupons
- Create discount coupons
- Coupon code, value, and type (flat amount or percentage — *to be confirmed*)
- Set validity period / expiry date
- Enable / disable a coupon
- Apply coupon during POS billing
- Edit / delete coupon
- List of all coupons with usage status

## 7. Task Management
- Admin assigns tasks to a Manager or Employee
- Set priority level (e.g., Low / Medium / High)
- Set deadline / end time
- Task status (Pending / In Progress / Completed — *to be confirmed*)
- View, edit, delete tasks
- Task list, filterable by assignee/status/priority

## 8. Attendance
- Attendance tracking for Manager and Employee accounts
- Check-in / check-out (or daily present/absent marking — *to be confirmed*)
- Attendance history per staff member
- Filter/report attendance by date range or staff

## 9. Expenses
- Record restaurant expenses (amount, date, description, category)
- List of all expenses
- Edit / delete expense entries
- Filter expenses by date range / category
- Feeds into the Reports module

## 10. Vendors
- List of all vendors
- Vendor details (name, contact info, items supplied, etc. — *to be confirmed*)
- Add / edit / delete vendor
- *(Open question: should vendors be linked to specific products or expenses?)*

## 11. Products
- List of all products the restaurant sells
- Add / edit / delete product
- Product fields: name, price, category, image, availability
- *(Open question: is stock/inventory tracking required, or are products just a sellable catalog for POS?)*

## 12. Categories
- List of product categories
- Add / edit / delete category
- Assign products to categories (used for filtering in POS, Products, and Income reports)

## 13. User Management
- List of all dashboard users (Admin, Manager, Employee)
- Add new user
- Assign role
- Configure granular permissions — which modules/actions each user can access (view/create/edit/delete per module)
- Edit / deactivate / delete user

## 14. Settings
- Restaurant name, address, logo
- Other business info: contact number, tax/GST info, business hours, etc. (*to be confirmed*; currency hardcoded to BDT)
- General application settings

## 15. User Activity Log
- Chronological log of all actions taken in the dashboard (e.g., "Order #123 completed by Employee X", "New user created by Admin", "Product deleted")
- Read-only audit trail
- Filter by user, date range, or action type

## 16. Income Section
- Product-based income breakdown (e.g., total income from Tea, Chicken Fry, etc.)
- Filterable by date range (Today / This Week / This Month / Custom)
- Likely sourced from completed Orders data

## 17. Customers
- List of customers
- Customer details: name, phone number, and other contact info (*fields to be confirmed*)
- Add / edit / delete customer
- *(Open question: should customers be linked to their order history?)*

## 18. Reports
- Generate reports: total sales, income, expenses
- Time scope: monthly, annual, and **custom date range filter**
- Export/print report as **PDF**
- Likely report types: Sales Report, Income Report, Expense Report, Attendance Report (*to be confirmed which are in scope for v1*)

---

# Non-Functional Requirements

- Mobile responsive (usable on tablet/phone for POS use at the counter)
- Secure, permission-based access control across all modules
- Fast loading, especially for POS and Dashboard
- Accurate financial calculations (no rounding/discount errors in billing and reports)
- Full audit trail via User Activity module
- Data validation on all forms (products, expenses, coupons, users, etc.)

---

