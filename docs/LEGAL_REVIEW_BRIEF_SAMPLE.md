# Legal Review Brief — Real Sample Output & Guide for Judges

> **AI Powered Orphanage Child Safety Management System**  
> **Hackathon Bounty Feature**: *Generate a Legal Review Brief*

---

## 1. Overview of the Demo Sample Record

A real demo legal record (`DEMO-LR-001`) has been created and seeded into the project database with realistic, completely fictional data (no real personal info used).

### Sample Record Summary (`DEMO-LR-001`)
- **Record ID**: `DEMO-LR-001`
- **Child Name & Code**: Priya Sharma (`CHILD-SUN-002`)
- **Adoptive Parent**: Vikram Sharma
- **Orphanage Home**: Sunshine Children Home (`ORP-DL-2024-001`)
- **Court Court Order & Jurisdiction**: District Family Court, Central New Delhi (`FC/ADO/2026/0492`)
- **CARA Registration**: Approved (`CARA-REG-2026-ND-8899`)
- **Key Legal Clauses**:
  1. Court Jurisdiction & Adoption Decree Venue (`FC/ADO/2026/0492` - VERIFIED)
  2. Central Adoption Resource Authority (CARA) Statutory Clearance (`CARA-REG-2026-ND-8899` - VERIFIED)
  3. Post-Adoption Welfare Follow-up Schedule (Initiated - SCHEDULED)
- **Detected Issues**:
  1. `[MEDIUM] DOCUMENTATION`: Annual income statement (`FINANCIAL_PROOFS`) is pending manual officer verification.
  2. `[LOW] COMPLIANCE`: Post-adoption quarterly welfare follow-up 2 scheduled, pending date confirmation.
- **Verification Status**:
  - Overall Status: `SUCCESSFUL`
  - Parent Background Verification: `APPROVED`
  - Parent Identity KYC: `APPROVED`
  - Police Verification: `CLEARED` (PCC-DL-2026-77881)
  - Document Checklist Ratio: `5/6 (83.3%)`
- **Reviewer Notes**:
  - **Legal Officer Note**: *"All statutory adoption checks cleared cleanly per juvenile welfare guidelines. Final court order decree validated on 2026-01-20."*
  - **Police Verification Note**: *"Background verification clean. Criminal background check returned clear across all national police databases (PCC-DL-2026-77881)."*
- **Review Summary**:
  - Outcome: `COMPLETED` | Risk Level: `LOW`
  - Recommendation: *"Final Legal Adoption Approved. Child successfully placed in permanent adoptive home."*

---

## 2. Sample PDF Files

The actual application workflow generated the real sample PDF file, which is committed and available at:

- 📄 **Documentation Copy**: [`docs/samples/legal-review-brief-sample.pdf`](file:///c:/Users/OM%20KUMAR%20GUPTA/Documents/all%20project/hackahton/algoolmpia%20team%20salvatroe/docs/samples/legal-review-brief-sample.pdf)
- 📄 **Backend Uploads Copy**: [`backend/uploads/samples/legal-review-brief-sample.pdf`](file:///c:/Users/OM%20KUMAR%20GUPTA/Documents/all%20project/hackahton/algoolmpia%20team%20salvatroe/backend/uploads/samples/legal-review-brief-sample.pdf)

---

## 3. How to Seed / Load the Sample Record

To re-seed or populate the database with `DEMO-LR-001`:

```bash
cd backend
npx prisma db seed
```

This populates the Postgres database with `DEMO-LR-001` alongside test users, orphanages, children, and documents.

---

## 4. How to Preview & Download in the Web Interface

1. Start Backend:
   ```bash
   cd backend
   npm run start:dev
   ```
2. Start Frontend:
   ```bash
   cd ..
   npm run dev
   ```
3. Open browser at `http://localhost:5173` and log in with demo credentials:
   - **Role**: `ADMIN` or `ORPHANAGE`
   - **Email**: `admin@safety.gov`
   - **Password**: `admin123`
4. Navigate to **Child Adoption Management** in the left sidebar.
5. In the **Adoption History** table or **Actions Card**, locate `DEMO-LR-001`.
6. Click **[ Preview ]** to open the live interactive **Legal Review Brief Preview Modal**.
7. Click **[ Download PDF ]** or **[ Download Review Brief ]** to download `legal-review-brief-DEMO-LR-001.pdf`.

---

## 5. How to Download via API Endpoint (cURL / Postman)

### Step 1: Login to get Bearer JWT
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@safety.gov","password":"admin123"}'
```

### Step 2: Download PDF Brief
```bash
curl -X GET http://localhost:3000/api/v1/adoptions/DEMO-LR-001/brief \
  -H "Authorization: Bearer <YOUR_JWT_ACCESS_TOKEN>" \
  --output legal-review-brief-DEMO-LR-001.pdf
```

### Step 3: Get Structured JSON DTO Data
```bash
curl -X GET http://localhost:3000/api/v1/adoptions/DEMO-LR-001/brief/data \
  -H "Authorization: Bearer <YOUR_JWT_ACCESS_TOKEN>"
```

---

## 6. Verification Status & Security Audit

- **Dynamic Generation**: Generated strictly from real database entity relations (`AdoptionRecord`, `Child`, `Parent`, `PoliceVerification`, `AdoptionDocument`).
- **Privacy & Safety**: All names, addresses, and phone numbers are completely fictional.
- **Header Compliance**: Binary stream starts with valid `%PDF-` header magic bytes and responds with `Content-Type: application/pdf`.
