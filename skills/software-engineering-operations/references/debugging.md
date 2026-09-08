# Debugging Reference

## Process

1. Collect logs, errors, versions and current state.
2. Reproduce or isolate the failure.
3. Check official documentation and known issues.
4. Identify root cause before changing code.
5. Apply the smallest safe fix.
6. Verify recovery with tests.

## Rules

- Do not randomly modify multiple components.
- Do not hide errors with temporary patches.
- Preserve rollback ability for risky changes.
