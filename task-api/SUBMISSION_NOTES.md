# Submission Notes

**What I'd test next:** invalid JSON bodies, very large `limit` values, bad `page` values like 0 or negative numbers, and direct unit tests for every function in `taskService.js`.

**What surprised me:** the status filter used `includes()`, so my first filter test passed even though the code was wrong. I only caught it by reading the code. The priority reset in `completeTask` was also a single hard-coded line that was easy to miss.

**Questions before production:** Is the in-memory store OK, or do we need a database? Who is allowed to assign a task, and should `assignee` be a real user id instead of free text?
