[README.md](https://github.com/user-attachments/files/33928672/README.md)
# SpendWise — Personal Expense Tracker

A responsive personal finance dashboard built with **HTML, CSS, and vanilla JavaScript**. Designed as a beginner-friendly DCA PRISM / portfolio project.

## Features

- Dashboard summary for monthly balance, income, expenses, and savings rate
- Add income and expense transactions with descriptions, dates, and categories
- Spending breakdown by category using a donut chart
- Cash-flow bar chart
- Search transactions and filter by income/expense
- Delete transactions with confirmation
- Export filtered transactions as CSV
- Responsive layout for desktop, tablet, and mobile
- Light/dark theme toggle
- Browser persistence using `localStorage`

## Run locally

1. Download or clone this repository.
2. Keep `index.html`, `style.css`, and `script.js` in the same folder.
3. Open `index.html` in a browser, or use the **Live Server** extension in VS Code.

No build tools or package installation are required.

## Project structure

```text
personal-expense-tracker/
├── index.html
├── style.css
├── script.js
└── README.md
```

## Data and privacy note

Transactions are saved in the browser's `localStorage` on the current device/browser. This starter project does **not** use a backend, user login, or cloud sync. Clearing browser data may remove saved transactions. Do not treat it as a bank account or financial service.

## Future improvements

- Backend database and account authentication
- Monthly budget limits and alerts
- Recurring transactions
- PDF report generation
- Multi-currency support

## Technologies

- HTML5
- CSS3 (responsive layout)
- JavaScript (DOM, events, localStorage, CSV export)
