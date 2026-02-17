## Packages
papaparse | CSV parsing for data upload
@types/papaparse | TypeScript types for papaparse
recharts | Charts for risk score visualization
react-diff-viewer | Side-by-side diff viewer for SAR version comparison
date-fns | Date formatting for audit trail

## Notes
- File uploads use multipart/form-data via FormData
- AI SAR generation may take 10-30 seconds - show loading spinner
- Audit trail should auto-refresh after edits
- Version comparison defaults to current vs. previous version
- All mutations invalidate relevant query keys for real-time updates
