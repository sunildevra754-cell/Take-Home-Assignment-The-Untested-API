# Bug Report

I found these bugs by running my tests and then reading `src/services/taskService.js`.

## 1. Pagination skips the first page
- **Where:** `getPaginated` in `taskService.js` (`const offset = page * limit;`)
- **Expected:** `?page=1&limit=2` gives the first 2 tasks.
- **Actual:** It gives tasks 3 and 4. The first 2 can never be reached.
- **How I found it:** the test "page 1 starts at the very first item" failed.
- **Why:** pages start at 1, but the offset was calculated as if they started at 0.
- **Fix:** `const offset = (page - 1) * limit;` (done)

## 2. Status filter matches part of a word
- **Where:** `getByStatus` in `taskService.js` (`t.status.includes(status)`)
- **Expected:** `?status=todo` returns only tasks with status exactly `todo`.
- **Actual:** `includes()` matches part of the text, so a value like `?status=do` also matches `todo` and `done`.
- **How I found it:** by reading the code. My normal filter test passed anyway, because `'todo'.includes('todo')` is true.
- **Fix:** `t.status === status` (done)

## 3. Completing a task resets its priority
- **Where:** `completeTask` in `taskService.js` (hard-coded `priority: 'medium'`)
- **Expected:** only `status` and `completedAt` change.
- **Actual:** a `high` priority task became `medium` after completing.
- **How I found it:** the test "does not change priority when completing" failed.
- **Fix:** removed the `priority: 'medium'` line (done)

## New endpoint: PATCH /tasks/:id/assign
- Returns the updated task (200), 404 if the task is missing.
- 400 if `assignee` is missing, not a string, empty/spaces only, or over 100 characters.
- The name is trimmed. Re-assigning an already assigned task is allowed.
