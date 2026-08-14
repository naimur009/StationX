Act as an expert UI/UX designer and frontend developer.

Analyze the existing project and **improve only the frontend design**. Make the UI modern, clean, professional, responsive, and visually consistent.

### Rules

* **Frontend changes ONLY.**
* **Do NOT modify backend code, APIs, database, authentication, or business logic.**
* Preserve all existing functionality and API integrations.
* Reuse the existing components and libraries where possible.
* Improve layout, spacing, typography, colors, buttons, cards, tables, forms, navigation, and responsive behavior.
* Do not add fake data or unnecessary dependencies.
* Keep the design consistent across all pages.
* Do not rewrite working functionality just for styling purposes.


## what need to modify

1. Overall page structure
SALARIES
Manage employee salaries, bonuses, deductions and payments


[ + Add Bonus ] [ − Add Cut ]


┌─────────────────────────────────────────────────────────────┐
│ Salary List    |    Reports                                 │
└─────────────────────────────────────────────────────────────┘


[ Month ] [ Year ] [ Employee ] [ Status ]


┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Employees  │ │ Total Paid │ │ Remaining  │ │ Net Salary │
│     12     │ │ ৳85,000    │ │ ৳25,000    │ │ ৳110,000   │
└────────────┘ └────────────┘ └────────────┘ └────────────┘


Salary Records
┌─────────────────────────────────────────────────────────────┐
│ Employee │ Net │ Paid │ Remaining │ Status │ Actions       │
├─────────────────────────────────────────────────────────────┤
│ Rahat    │...  │ ...  │ ...       │ ...    │ •••           │
│ Naimur   │...  │ ...  │ ...       │ ...    │ •••           │
└─────────────────────────────────────────────────────────────┘

The important change is: don't show every possible financial field in the main table.

2. Salary List — redesign

Your current table has:

Employee | Base Salary | Bonus | Cut | Net | Total Paid | Remaining | Advances | Status | Actions

That's too many columns.

Recommended main table
Employee	Net Salary	Paid	Remaining	Status	Actions
Rahat	৳10,000	৳5,000	৳5,000	Partially Paid	View
Naimur Rahaman	৳1,000	৳0	৳1,000	Unpaid	View

Then put Bonus, Cut, Base Salary and Advances inside the details drawer/modal.

This makes the primary table much easier to scan.

Row actions

Instead of:

👁 $ 🎁 − 🗑

use one clean action:

•••

with:

View Details
Record Payment
Add Bonus
Add Deduction
Delete

You can keep a quick Pay button if payment is a frequent operation.

3. Summary cards

Your current cards are too large and there are too many competing colors.

For Salary List, I'd use only 4:

Employees
12


Total Salary
৳120,000


Paid
৳85,000


Remaining
৳35,000
Don't use this:
Employees
Total Paid
Total Bonus
Total Cut
Net Salary

as five equal cards.

Bonus and deductions are secondary information.

You can show them in a small secondary summary:

Bonus +৳5,000     Deductions -৳2,000
4. Filters

Your current filter section is visually oversized.

Instead of one huge card:

┌─────────────────────────────────────────────────────────────┐
│ August     │ 2026     │ All Employees                      │
└─────────────────────────────────────────────────────────────┘

use:

August 2026


[ Month ▼ ] [ Year ▼ ] [ Employee ▼ ] [ Status ▼ ]

On desktop these can sit on one line.

On medium:

[ Month ] [ Year ]
[ Employee ] [ Status ]

On mobile:

[ August ▼ ]
[ 2026 ▼ ]
[ All Employees ▼ ]
[ All Status ▼ ]

Don't force filters to remain horizontal on small screens.

5. Report page needs a different structure

This is where your current design has the biggest problem.

Currently you have:

Filters
↓
5 summary cards
↓
Employee table
↓
Unknown — 2026
↓
5 more summary cards
↓
12-month table

This creates a very long report and makes it unclear what the user is looking at.

Instead:

REPORTS


[ Month ] [ Year ] [ Employee ]


Overview
┌────────────┐ ┌────────────┐ ┌────────────┐
│ Total Paid │ │ Bonus      │ │ Deduction  │
│ ৳85,000    │ │ ৳5,000     │ │ ৳2,000     │
└────────────┘ └────────────┘ └────────────┘


Employee Summary
┌────────────────────────────────────────────────────────────┐
│ Employee │ Paid │ Bonus │ Cut │ Net │ Status              │
└────────────────────────────────────────────────────────────┘


Annual Breakdown
┌────────────────────────────────────────────────────────────┐
│ Month │ Net │ Paid │ Remaining │ Status                    │
└────────────────────────────────────────────────────────────┘

And only show the annual breakdown after an employee is selected.

6. Fix the "Unknown — 2026" problem

This is also a major UX/data presentation issue.

You currently have:

Unknown — 2026

That should never appear in a polished UI.

If no employee is selected:

Annual Salary Overview — 2026

If an employee is selected:

Rahat — Salary Overview 2026

If the employee data is actually missing:

Employee information unavailable

Never expose Unknown as a heading.

7. Annual report should be much simpler

Your current 12-month table has too many columns:

Month
Salary Paid
Bonus
Cut
Net
Remaining
Status
Paid Date
Adjustments

For the annual view, use:

Month	Net Salary	Paid	Remaining	Status
January	৳10,000	৳10,000	৳0	Paid
February	৳10,000	৳5,000	৳5,000	Partial
March	৳10,000	৳0	৳10,000	Unpaid

Then clicking a month opens its detailed information.

This is much cleaner.

8. Salary Details modal

Your modal is actually fairly good structurally, but I'd turn it into a right-side drawer on desktop rather than a centered modal.

Desktop
                         ┌─────────────────────────────┐
                         │ Salary Details          ×   │
                         ├─────────────────────────────┤
                         │                             │
                         │ Rahat                       │
                         │ August 2026                 │
                         │ 🟡 Partially Paid           │
                         │                             │
                         │ Net Salary                  │
                         │ ৳10,000                     │
                         │                             │
                         │ Paid          Remaining     │
                         │ ৳5,000        ৳5,000         │
                         │                             │
                         │ Salary Breakdown            │
                         │ Base        ৳10,000         │
                         │ Bonus       +৳0             │
                         │ Deduction   -৳0             │
                         │                             │
                         │ Payment History             │
                         │ +৳5,000   Aug 14             │
                         │                             │
                         ├─────────────────────────────┤
                         │ [Record Payment] [Close]    │
                         └─────────────────────────────┘

This allows the user to keep the salary list visible behind it.

9. Mobile structure

This is important: do not make the desktop table horizontally overflow on mobile.

On mobile, each salary becomes a card.

Mobile
Salary Records


┌─────────────────────────────┐
│ Rahat              ● Partial│
│                             │
│ Net Salary                  │
│ ৳10,000                     │
│                             │
│ Paid          Remaining     │
│ ৳5,000        ৳5,000        │
│                             │
│ [View Details]        •••    │
└─────────────────────────────┘


┌─────────────────────────────┐
│ Naimur Rahaman      ● Unpaid│
│                             │
│ Net Salary                  │
│ ৳1,000                      │
│                             │
│ Paid          Remaining     │
│ ৳0            ৳1,000        │
│                             │
│ [View Details]        •••    │
└─────────────────────────────┘

This will look far better than squeezing 9 columns into a 375–430px screen.

10. Responsive breakpoints

I'd structure the layout around three modes.

Large — ≥1200px

Use:

Header
Tabs
Filters → one row
Summary → 4 cards
Full salary table

Tables can show 6 columns.

Medium — 768–1199px

Use:

Header
Tabs
Filters → 2 × 2
Summary → 2 × 2


Salary table:
Employee
Net
Paid
Remaining
Status
Actions

Hide less important columns.

For example:

Base Salary
Bonus
Cut
Advances

move into details.

Small — <768px

Use:

Header


[Add Bonus]
[Add Cut]


Tabs


Filters
↓
Summary cards
↓
Salary cards

Cards should be:

1 column

or summary cards:

2 columns

depending on width.

At very small widths, summary cards can become a horizontal scroll strip or single column.

11. Header responsive behavior

Desktop:

Salaries                         [+ Add Bonus] [− Add Cut]
Manage employee salaries...

Tablet:

Salaries                    [+ Bonus] [− Cut]
Manage employee salaries...

Mobile:

Salaries
Manage employee salaries...


[ + Add Bonus ]
[ − Add Cut ]

Don't keep the buttons squeezed beside the title on mobile.



Finally, run the frontend build/type checks and fix any frontend errors caused by your changes.

**Important: Do not touch any backend files under any circumstances.**
