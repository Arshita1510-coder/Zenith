# Zenith Demo Script

## Step 1: Employee Creates Goals

Logged in as: `employee@atomquest.test`

Click:
- Select the Employee demo account.
- Open My Goal Sheet.
- Add 5 goals using Min, Max, Timeline, Zero, and Min UoM types.
- Set weightage to total exactly 100%.
- Click Save Draft, then Submit for Approval.

Verify:
- Inline validation appears if weightage is not 100%, any goal is below 10%, or more than 8 goals are added.
- After submission, the sheet status is Submitted and the form is read-only.

## Step 2: Manager Approves Goals

Logged in as: `manager@atomquest.test`

Click:
- Open My Team.
- Find the submitted employee goal sheet.
- Edit one planned target and click Save.
- Click Approve goal sheet.

Verify:
- The employee receives an in-app approval notification.
- The approved goals appear as locked for achievement updates.

## Step 3: Admin Opens Q1 Window

Logged in as: `admin@atomquest.test`

Click:
- Open Cycle Management.
- Ensure Q1 is open.
- Close or open another quarter to show admin control.

Verify:
- Employees can only enter achievements for open windows.
- Closed quarter inputs are disabled with a clear message.

## Step 4: Employee Logs Q1 Achievements

Logged in as: `employee@atomquest.test`

Click:
- Open My Goals.
- Select Q1.
- Enter achievements for all UoM types.
- Submit each update.

Verify:
- Min targets score actual divided by target.
- Max targets score target divided by actual.
- Timeline targets show Early, On Time, or Delayed.
- Zero targets show 100% when actual is 0 and 0% when actual is above 0.
- Submitted achievements lock after saving.

## Step 5: Manager Completes Check-In

Logged in as: `manager@atomquest.test`

Click:
- Open My Team.
- Review Planned vs Actual.
- Add a structured check-in comment.
- Check Mark check-in as completed.
- Click Save check-in.

Verify:
- Completion status updates for the employee and quarter.

## Step 6: Admin Reviews Reports

Logged in as: `admin@atomquest.test`

Click:
- Open Completion Dashboard.
- Open Reports and export CSV or Excel.
- Open Audit Log and export CSV.
- Open Analytics.

Verify:
- Completion cards show employee status by quarter.
- Achievement report filters work.
- Audit log includes unlocks and manager target edits.
- Analytics renders all four views: distribution, weightage, QoQ trend, heatmap, and completion gauge.

## Step 7: Escalations and Notifications

Logged in as: `admin@atomquest.test`

Click:
- Open Escalations.
- Click Run Escalation Check Now.
- Add a resolution note to one escalation.
- Click Mark Resolved.
- Open the notification bell.

Verify:
- Escalation summary cards update.
- The resolved escalation shows the note.
- Notification badge decreases after opening a notification.

## Wow Moments

- Real escalation engine: overdue goal sheets, pending approvals, missing achievements, and manager check-ins are detected and resolved in one dashboard.
- Analytics suite: judges can see strategic goal mix, average weightage, progress heatmap, QoQ trend, and completion gauge without leaving the portal.
- Governance polish: role-based JWT protection, audit logs, admin unlocks, window controls, notifications, exports, and dark mode are all demo-ready.
