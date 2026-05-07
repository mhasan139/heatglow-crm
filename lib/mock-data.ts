// HeatGlow CRM — Realistic Mock Data for Cardiff-based heating company

export type EnquiryStatus = "New" | "Qualified" | "Rejected";
export type CustomerStatus = "Lead" | "Customer" | "Lost" | "On Hold";
export type JobType =
  | "Boiler Service"
  | "Boiler Repair"
  | "Boiler Install"
  | "Central Heating"
  | "Power Flush"
  | "Gas Safety Certificate"
  | "Emergency Callout"
  | "Bathroom"
  | "Other";
export type UrgencyLevel = "Normal" | "Urgent" | "Emergency";
export type InvoiceStatus = "Paid" | "Awaiting" | "Pending";
export type HeatShieldStatus = "Active" | "Service Due" | "Lapsed" | "Cancelled";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  customerSince: string;
  totalSpend: number;
  jobCount: number;
  isHeatShield: boolean;
  sm8Id: string;
  status: CustomerStatus;
}

export interface StopLogEntry {
  id: string;
  customerId: string;
  campaignName: string;
  dateStopped: string;
  reason: "Status changed to Customer" | "Replied to email" | "Quote accepted in ServiceM8" | "Manually marked as contacted" | "Status changed to Lost" | "Status changed to On Hold";
}

export interface CustomerCampaignHistory {
  id: string;
  customerId: string;
  campaignName: string;
  dateSent: string;
  opens: number;
  clicks: number;
  status: "Delivered" | "Opened" | "Clicked" | "Replied" | "Bounced";
}

export interface ActiveSequence {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  campaignName: string;
  currentEmail: 1 | 2 | 3;
  nextSendDate: string;
  status: "Active" | "Paused" | "Stopped";
  startedDate: string;
}

export interface Job {
  id: string;
  jobRef: string;
  customerId: string;
  customerName: string;
  jobType: JobType;
  date: string;
  engineer: string;
  invoiceStatus: InvoiceStatus;
  amount: number;
  description: string;
  status: "Completed" | "In Progress" | "Scheduled";
}

export interface Enquiry {
  id: string;
  createdAt: string;
  customerName: string;
  email: string;
  phone: string;
  postcode: string;
  jobType: JobType;
  urgency: UrgencyLevel;
  source: string;
  description: string;
  aiScore: number;
  aiRecommendation: "QUALIFY" | "REVIEW" | "REJECT";
  aiReasoning: string;
  status: EnquiryStatus;
  rejectionReason?: string;
  sm8JobRef?: string;
}

export interface HeatShieldMember {
  id: string;
  customerId: string;
  customerName: string;
  email: string;
  phone: string;
  postcode: string;
  signUpDate: string;
  lastServiceDate: string;
  nextServiceDue: string;
  monthlyAmount: number;
  status: HeatShieldStatus;
  daysElapsed: number;
}

export interface ActivityEvent {
  id: string;
  type: "enquiry" | "qualification" | "job" | "invoice" | "heatshield" | "email";
  description: string;
  timestamp: string;
  icon: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: "Draft" | "Pending Approval" | "Approved" | "Sent";
  subject: string;
  segment: string;
  recipientCount: number;
  scheduledDate: string;
  isAutoTriggered: boolean;
  approvalState: "Awaiting" | "Approved" | "Rejected";
  previewBody: string;
  triggerReason?: string;
  sentDate?: string;
  openRate?: number;
  clickRate?: number;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  category: "Win-back" | "HeatShield" | "Seasonal" | "Service Reminder" | "Custom";
  subject: string;
  bodyPreview: string;
  body: string;
  lastModified: string;
  tags: string[];
}

export interface AutomationRule {
  id: string;
  name: string;
  triggerDescription: string;
  isActive: boolean;
  timingValue: number;
  timingUnit: "days" | "weeks" | "months";
  timingDirection: "before" | "after";
  templateId: string;
  templateName: string;
  lastTriggered: string | null;
  draftsCreated: number;
  category: "HeatShield" | "Quotes" | "Reactivation";
}

export interface SuppressionEntry {
  id: string;
  email: string;
  name: string | null;
  dateAdded: string;
  source: "Unsubscribed via email link" | "Added manually";
}

export interface CampaignRecipient {
  id: string;
  name: string;
  email: string;
  status: "Delivered" | "Opened" | "Clicked" | "Bounced" | "Unsubscribed" | "Failed";
  openedAt: string | null;
  clickedAt: string | null;
  lastJobDate?: string;
  renewalDate?: string;
}

export interface CampaignResult {
  campaignId: string;
  sentDate: string;
  totalRecipients: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  timelineData: { time: string; opens: number; clicks: number }[];
  recipients: CampaignRecipient[];
}

// ─── Customers ───────────────────────────────────────────────────────────────
export const mockCustomers: Customer[] = [
  { id: "c1", name: "Sarah Morgan", email: "sarah.morgan@gmail.com", phone: "07712 345678", address: "14 Heol Isaf", postcode: "CF14 1AB", customerSince: "2021-03-15", totalSpend: 3840, jobCount: 6, isHeatShield: true, sm8Id: "SM8-3421", status: "Customer" },
  { id: "c2", name: "David Rees", email: "david.rees@hotmail.co.uk", phone: "07823 456789", address: "7 Birchgrove Road", postcode: "CF14 4AA", customerSince: "2022-06-20", totalSpend: 1250, jobCount: 3, isHeatShield: false, sm8Id: "SM8-1872", status: "Lead" },
  { id: "c3", name: "Amanda Price", email: "amanda.price@btinternet.com", phone: "07934 567890", address: "32 Romilly Road", postcode: "CF5 1FH", customerSince: "2020-11-08", totalSpend: 5720, jobCount: 8, isHeatShield: true, sm8Id: "SM8-0934", status: "Customer" },
  { id: "c4", name: "Mark Williams", email: "mark.w@outlook.com", phone: "07645 678901", address: "18 Cyncoed Road", postcode: "CF23 6RA", customerSince: "2023-01-14", totalSpend: 890, jobCount: 2, isHeatShield: false, sm8Id: "SM8-4521", status: "Lead" },
  { id: "c5", name: "Lynne Davies", email: "lynne.davies@gmail.com", phone: "07756 789012", address: "5 Station Road", postcode: "CF14 2TH", customerSince: "2021-08-30", totalSpend: 2140, jobCount: 4, isHeatShield: true, sm8Id: "SM8-2104", status: "Customer" },
  { id: "c6", name: "Robert Evans", email: "r.evans@yahoo.co.uk", phone: "07867 890123", address: "91 Whitchurch Road", postcode: "CF14 3JP", customerSince: "2022-02-17", totalSpend: 3280, jobCount: 5, isHeatShield: false, sm8Id: "SM8-2887", status: "On Hold" },
  { id: "c7", name: "Helen Thomas", email: "helen.thomas@gmail.com", phone: "07978 901234", address: "23 Llandennis Avenue", postcode: "CF23 7LN", customerSince: "2019-07-22", totalSpend: 7430, jobCount: 11, isHeatShield: true, sm8Id: "SM8-0456", status: "Customer" },
  { id: "c8", name: "Paul Jones", email: "paul.j@icloud.com", phone: "07489 012345", address: "67 Merthyr Road", postcode: "CF14 1DA", customerSince: "2023-04-05", totalSpend: 760, jobCount: 2, isHeatShield: false, sm8Id: "SM8-5102", status: "Lead" },
  { id: "c9", name: "Karen Lloyd", email: "karen.lloyd@sky.com", phone: "07590 123456", address: "11 Llandaff Road", postcode: "CF11 9NE", customerSince: "2020-05-19", totalSpend: 4960, jobCount: 7, isHeatShield: true, sm8Id: "SM8-1345", status: "Customer" },
  { id: "c10", name: "James Harris", email: "james.harris@gmail.com", phone: "07601 234567", address: "44 Pen-y-Wain Road", postcode: "CF24 4RA", customerSince: "2022-09-11", totalSpend: 1680, jobCount: 3, isHeatShield: false, sm8Id: "SM8-3654", status: "Lost" },
  { id: "c11", name: "Diane Collins", email: "diane.c@hotmail.com", phone: "07712 345001", address: "8 Fairwater Road", postcode: "CF5 3AT", customerSince: "2021-12-03", totalSpend: 2850, jobCount: 5, isHeatShield: true, sm8Id: "SM8-2398", status: "Customer" },
  { id: "c12", name: "Gareth Powell", email: "g.powell@btinternet.com", phone: "07823 456002", address: "19 Bute Street", postcode: "CF10 5AN", customerSince: "2023-07-28", totalSpend: 450, jobCount: 1, isHeatShield: false, sm8Id: "SM8-5876", status: "Lead" },
] as Customer[];

// ─── Stop Log ─────────────────────────────────────────────────────────────────
export const mockStopLog: StopLogEntry[] = [
  { id: "sl1", customerId: "c1", campaignName: "Lapsed Quote Follow-up", dateStopped: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), reason: "Quote accepted in ServiceM8" },
  { id: "sl2", customerId: "c1", campaignName: "HeatShield Renewal Reminder", dateStopped: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), reason: "Replied to email" },
  { id: "sl3", customerId: "c3", campaignName: "Win-back 3-touch", dateStopped: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), reason: "Status changed to Customer" },
  { id: "sl4", customerId: "c7", campaignName: "Inactive Customer Win-back", dateStopped: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), reason: "Manually marked as contacted" },
];

// ─── Customer Campaign History ────────────────────────────────────────────────
export const mockCustomerCampaignHistory: CustomerCampaignHistory[] = [
  { id: "cch1", customerId: "c1", campaignName: "HeatShield Spring Service Reminder", dateSent: "2026-03-15", opens: 1, clicks: 1, status: "Clicked" },
  { id: "cch2", customerId: "c1", campaignName: "Lapsed Quote Follow-up", dateSent: "2026-02-28", opens: 1, clicks: 0, status: "Opened" },
  { id: "cch3", customerId: "c1", campaignName: "New Enquiry Acknowledgement", dateSent: "2026-01-10", opens: 1, clicks: 0, status: "Opened" },
  { id: "cch4", customerId: "c3", campaignName: "Win-back 3-touch — Email 1", dateSent: "2026-03-01", opens: 0, clicks: 0, status: "Delivered" },
  { id: "cch5", customerId: "c3", campaignName: "HeatShield Renewal Reminder", dateSent: "2026-02-10", opens: 1, clicks: 1, status: "Replied" },
  { id: "cch6", customerId: "c7", campaignName: "Winter Prep Seasonal", dateSent: "2025-10-05", opens: 1, clicks: 0, status: "Opened" },
  { id: "cch7", customerId: "c7", campaignName: "Inactive Customer Win-back", dateSent: "2026-03-20", opens: 0, clicks: 0, status: "Bounced" },
];

// ─── Active Sequences ─────────────────────────────────────────────────────────
export const mockActiveSequences: ActiveSequence[] = [
  { id: "as1", customerId: "c2", customerName: "David Rees", customerEmail: "david.rees@hotmail.co.uk", campaignName: "Lapsed Quote 3-touch", currentEmail: 2, nextSendDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), status: "Active", startedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "as2", customerId: "c4", customerName: "Mark Williams", customerEmail: "mark.w@outlook.com", campaignName: "Lapsed Quote 3-touch", currentEmail: 1, nextSendDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), status: "Active", startedDate: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "as3", customerId: "c8", customerName: "Paul Jones", customerEmail: "paul.j@icloud.com", campaignName: "Inactive Win-back 3-touch", currentEmail: 3, nextSendDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), status: "Active", startedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "as4", customerId: "c10", customerName: "James Harris", customerEmail: "james.harris@gmail.com", campaignName: "HeatShield Lapsed 3-touch", currentEmail: 1, nextSendDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), status: "Paused", startedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "as5", customerId: "c12", customerName: "Gareth Powell", customerEmail: "g.powell@btinternet.com", campaignName: "One-time Customer Win-back", currentEmail: 2, nextSendDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), status: "Active", startedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
];

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export const mockJobs: Job[] = [
  { id: "j1", jobRef: "HG-2024-0142", customerId: "c1", customerName: "Sarah Morgan", jobType: "Boiler Service", date: "2024-03-10", engineer: "Owen", invoiceStatus: "Paid", amount: 95, description: "Annual boiler service and safety check", status: "Completed" },
  { id: "j2", jobRef: "HG-2024-0143", customerId: "c3", customerName: "Amanda Price", jobType: "Boiler Install", date: "2024-03-12", engineer: "Gareth", invoiceStatus: "Paid", amount: 2800, description: "Worcester Bosch Greenstar 4000 installation", status: "Completed" },
  { id: "j3", jobRef: "HG-2024-0144", customerId: "c7", customerName: "Helen Thomas", jobType: "Power Flush", date: "2024-03-14", engineer: "Karl", invoiceStatus: "Awaiting", amount: 380, description: "Full system power flush, 12 radiators", status: "Completed" },
  { id: "j4", jobRef: "HG-2024-0145", customerId: "c2", customerName: "David Rees", jobType: "Boiler Repair", date: "2024-03-15", engineer: "Gareth", invoiceStatus: "Paid", amount: 210, description: "Faulty heat exchanger replaced", status: "Completed" },
  { id: "j5", jobRef: "HG-2024-0146", customerId: "c9", customerName: "Karen Lloyd", jobType: "Gas Safety Certificate", date: "2024-03-16", engineer: "Owen", invoiceStatus: "Paid", amount: 75, description: "Annual gas safety certificate for landlord", status: "Completed" },
  { id: "j6", jobRef: "HG-2024-0147", customerId: "c5", customerName: "Lynne Davies", jobType: "Emergency Callout", date: "2024-03-18", engineer: "Gareth", invoiceStatus: "Awaiting", amount: 195, description: "No heating — pump failure, replaced on site", status: "Completed" },
  { id: "j7", jobRef: "HG-2024-0148", customerId: "c11", customerName: "Diane Collins", jobType: "Bathroom", date: "2024-03-20", engineer: "Karl", invoiceStatus: "Paid", amount: 1840, description: "Full bathroom refit, new suite and tiling", status: "Completed" },
  { id: "j8", jobRef: "HG-2024-0149", customerId: "c6", customerName: "Robert Evans", jobType: "Central Heating", date: "2024-03-21", engineer: "Owen", invoiceStatus: "Pending", amount: 3200, description: "New central heating system, 14 radiators", status: "In Progress" },
  { id: "j9", jobRef: "HG-2024-0150", customerId: "c4", customerName: "Mark Williams", jobType: "Boiler Service", date: "2024-03-22", engineer: "Karl", invoiceStatus: "Paid", amount: 95, description: "Annual boiler service", status: "Completed" },
  { id: "j10", jobRef: "HG-2024-0151", customerId: "c1", customerName: "Sarah Morgan", jobType: "Gas Safety Certificate", date: "2024-03-23", engineer: "Gareth", invoiceStatus: "Paid", amount: 75, description: "CP12 gas safety certificate", status: "Completed" },
  { id: "j11", jobRef: "HG-2024-0152", customerId: "c10", customerName: "James Harris", jobType: "Boiler Repair", date: "2024-03-24", engineer: "Owen", invoiceStatus: "Awaiting", amount: 165, description: "Pressure relief valve replaced", status: "Completed" },
  { id: "j12", jobRef: "HG-2024-0153", customerId: "c3", customerName: "Amanda Price", jobType: "Boiler Service", date: "2024-03-25", engineer: "Karl", invoiceStatus: "Paid", amount: 95, description: "Annual boiler service and gas check", status: "Completed" },
  { id: "j13", jobRef: "HG-2024-0154", customerId: "c7", customerName: "Helen Thomas", jobType: "Boiler Install", date: "2024-03-26", engineer: "Gareth", invoiceStatus: "Paid", amount: 3400, description: "Vaillant ecoTEC Pro 28 combi installation", status: "Completed" },
  { id: "j14", jobRef: "HG-2024-0155", customerId: "c9", customerName: "Karen Lloyd", jobType: "Power Flush", date: "2024-03-27", engineer: "Owen", invoiceStatus: "Paid", amount: 320, description: "Power flush, 10 radiators, magnetic filter fitted", status: "Completed" },
  { id: "j15", jobRef: "HG-2024-0156", customerId: "c12", customerName: "Gareth Powell", jobType: "Gas Safety Certificate", date: "2024-03-28", engineer: "Karl", invoiceStatus: "Pending", amount: 75, description: "Gas safety check and certificate", status: "Scheduled" },
  { id: "j16", jobRef: "HG-2024-0157", customerId: "c8", customerName: "Paul Jones", jobType: "Emergency Callout", date: "2024-03-28", engineer: "Gareth", invoiceStatus: "Awaiting", amount: 195, description: "Boiler lockout — reset and diagnostics", status: "Completed" },
  { id: "j17", jobRef: "HG-2024-0158", customerId: "c2", customerName: "David Rees", jobType: "Boiler Service", date: "2024-03-29", engineer: "Owen", invoiceStatus: "Paid", amount: 95, description: "Annual service and filter clean", status: "Completed" },
  { id: "j18", jobRef: "HG-2024-0159", customerId: "c11", customerName: "Diane Collins", jobType: "Boiler Service", date: "2024-03-30", engineer: "Karl", invoiceStatus: "Paid", amount: 95, description: "HeatShield member annual service", status: "Completed" },
  { id: "j19", jobRef: "HG-2024-0160", customerId: "c5", customerName: "Lynne Davies", jobType: "Central Heating", date: "2024-03-30", engineer: "Gareth", invoiceStatus: "Awaiting", amount: 1200, description: "Two new radiators fitted in extension", status: "Completed" },
  { id: "j20", jobRef: "HG-2024-0161", customerId: "c6", customerName: "Robert Evans", jobType: "Boiler Repair", date: "2024-03-31", engineer: "Owen", invoiceStatus: "Paid", amount: 280, description: "Diverter valve replacement", status: "Completed" },
];

// ─── Enquiries ────────────────────────────────────────────────────────────────
export const mockEnquiries: Enquiry[] = [
  {
    id: "e1", createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    customerName: "Tom Bradley", email: "tom.bradley@gmail.com", phone: "07712 111222",
    postcode: "CF14 2AB", jobType: "Boiler Install", urgency: "Normal", source: "Google",
    description: "Current boiler is 18 years old and keeps losing pressure. Looking to replace with a modern combi. 3 bed semi, currently have a system boiler with a tank in the loft. Want a like-for-like combi replacement if possible.",
    aiScore: 87, aiRecommendation: "QUALIFY",
    aiReasoning: "Strong enquiry. Specific boiler details provided, clear upgrade path identified, postcode in service area. Customer articulate and well-prepared. High conversion probability.",
    status: "New",
  },
  {
    id: "e2", createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    customerName: "Priya Sharma", email: "priya.s@outlook.com", phone: "07823 222333",
    postcode: "CF23 5LM", jobType: "Boiler Service", urgency: "Normal", source: "Referral",
    description: "Friend recommended HeatGlow. Need annual boiler service, Worcester Bosch 30i. Never had an issue with it, just due its service.",
    aiScore: 72, aiRecommendation: "QUALIFY",
    aiReasoning: "Good quality enquiry. Referral source is high-trust. Clear job type, known boiler model. Routine service with good conversion likelihood.",
    status: "Qualified", sm8JobRef: "HG-2024-0139",
  },
  {
    id: "e3", createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    customerName: "Mike Fletcher", email: "mfletcher@btinternet.com", phone: "07934 333444",
    postcode: "CF5 4NW", jobType: "Emergency Callout", urgency: "Emergency",
    source: "Google", description: "No heating at all. Boiler showing F22 fault code. Have two young children. URGENT.",
    aiScore: 91, aiRecommendation: "QUALIFY",
    aiReasoning: "Emergency callout with children — high priority. CF5 postcode in area. F22 fault code indicates low water pressure, likely a quick fix. Clear and credible.",
    status: "New",
  },
  {
    id: "e4", createdAt: new Date(Date.now() - 52 * 60 * 60 * 1000).toISOString(),
    customerName: "Janet Owens", email: "janet.owens@sky.com", phone: "07645 444555",
    postcode: "CF14 6RA", jobType: "Power Flush", urgency: "Normal", source: "Facebook",
    description: "Some radiators not heating up properly. Heard a power flush might help. Not sure if that's right though.",
    aiScore: 54, aiRecommendation: "REVIEW",
    aiReasoning: "Uncertain about diagnosis — may need investigation before committing to power flush. Could also be TRV issue. Worth a call to clarify before proceeding.",
    status: "New",
  },
  {
    id: "e5", createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    customerName: "Chris Watkins", email: "c.watkins@icloud.com", phone: "07756 555666",
    postcode: "CF10 3NP", jobType: "Gas Safety Certificate", urgency: "Normal", source: "Website",
    description: "Landlord certificate needed for my rental property on Albany Road. Due next month.",
    aiScore: 95, aiRecommendation: "QUALIFY",
    aiReasoning: "Landlord CP12 — very high value segment. Clear deadline, CF10 in area. Likely to be repeat customer. Auto-qualify recommended.",
    status: "Qualified", sm8JobRef: "HG-2024-0141",
  },
  {
    id: "e6", createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    customerName: "Steve Nash", email: "steve.n@hotmail.co.uk", phone: "07867 666777",
    postcode: "NP44 2AB", jobType: "Boiler Repair", urgency: "Urgent", source: "Google",
    description: "Boiler keeps cutting out. Already had another engineer look at it but they couldn't fix it.",
    aiScore: 28, aiRecommendation: "REJECT",
    aiReasoning: "NP44 postcode is outside service area (Newport). Previous engineer involvement may indicate complex fault. Distance and complexity make this unviable.",
    status: "Rejected", rejectionReason: "Outside service area",
  },
  {
    id: "e7", createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    customerName: "Louise Edwards", email: "louise.e@gmail.com", phone: "07978 777888",
    postcode: "CF15 9AX", jobType: "Bathroom", urgency: "Normal", source: "Checkatrade",
    description: "Full bathroom renovation. Existing suite needs full replacement. Looking for supply and fit. Have Pinterest board ready if helpful.",
    aiScore: 65, aiRecommendation: "REVIEW",
    aiReasoning: "Good enquiry — CF15 in area. Bathroom jobs carry good margin. Checkatrade source is credible. Will need site visit for quote. Review recommended.",
    status: "New",
  },
  {
    id: "e8", createdAt: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
    customerName: "Rob Griffiths", email: "rob.griffiths@sky.com", phone: "07489 888999",
    postcode: "CF83 2PN", jobType: "Central Heating", urgency: "Normal", source: "Referral",
    description: "New build extension — 3 extra rooms need heating extending into them. Currently have 12 rads. Want to add 3-4 more.",
    aiScore: 82, aiRecommendation: "QUALIFY",
    aiReasoning: "High-value job. CF83 in service area. Clear scope defined. Referral source is trusted. Radiator extension is clean, profitable work.",
    status: "New",
  },
];

// ─── HeatShield Members ───────────────────────────────────────────────────────
export const mockHeatShieldMembers: HeatShieldMember[] = [
  { id: "hs1", customerId: "c1", customerName: "Sarah Morgan", email: "sarah.morgan@gmail.com", phone: "07712 345678", postcode: "CF14 1AB", signUpDate: "2022-01-15", lastServiceDate: "2024-01-15", nextServiceDue: "2025-01-15", monthlyAmount: 10, status: "Active", daysElapsed: 75 },
  { id: "hs2", customerId: "c3", customerName: "Amanda Price", email: "amanda.price@btinternet.com", phone: "07934 567890", postcode: "CF5 1FH", signUpDate: "2021-05-20", lastServiceDate: "2023-05-20", nextServiceDue: "2024-05-20", monthlyAmount: 10, status: "Service Due", daysElapsed: 320 },
  { id: "hs3", customerId: "c5", customerName: "Lynne Davies", email: "lynne.davies@gmail.com", phone: "07756 789012", postcode: "CF14 2TH", signUpDate: "2022-08-10", lastServiceDate: "2023-08-10", nextServiceDue: "2024-08-10", monthlyAmount: 10, status: "Active", daysElapsed: 238 },
  { id: "hs4", customerId: "c7", customerName: "Helen Thomas", email: "helen.thomas@gmail.com", phone: "07978 901234", postcode: "CF23 7LN", signUpDate: "2020-03-15", lastServiceDate: "2022-10-15", nextServiceDue: "2023-10-15", monthlyAmount: 10, status: "Lapsed", daysElapsed: 532 },
  { id: "hs5", customerId: "c9", customerName: "Karen Lloyd", email: "karen.lloyd@sky.com", phone: "07590 123456", postcode: "CF11 9NE", signUpDate: "2021-11-30", lastServiceDate: "2024-02-28", nextServiceDue: "2025-02-28", monthlyAmount: 10, status: "Active", daysElapsed: 31 },
  { id: "hs6", customerId: "c11", customerName: "Diane Collins", email: "diane.c@hotmail.com", phone: "07712 345001", postcode: "CF5 3AT", signUpDate: "2022-04-08", lastServiceDate: "2023-04-08", nextServiceDue: "2024-04-08", monthlyAmount: 10, status: "Service Due", daysElapsed: 357 },
  { id: "hs7", customerId: "c2", customerName: "David Rees", email: "david.rees@hotmail.co.uk", phone: "07823 456789", postcode: "CF14 4AA", signUpDate: "2023-06-01", lastServiceDate: "2023-12-01", nextServiceDue: "2024-12-01", monthlyAmount: 10, status: "Active", daysElapsed: 119 },
  { id: "hs8", customerId: "c6", customerName: "Robert Evans", email: "r.evans@yahoo.co.uk", phone: "07867 890123", postcode: "CF14 3JP", signUpDate: "2021-09-14", lastServiceDate: "2022-09-14", nextServiceDue: "2023-09-14", monthlyAmount: 10, status: "Lapsed", daysElapsed: 563 },
];

// ─── Activity Feed ────────────────────────────────────────────────────────────
export const mockActivity: ActivityEvent[] = [
  { id: "a1", type: "enquiry", description: "New enquiry from Tom Bradley — Boiler Install, CF14", timestamp: new Date(Date.now() - 65 * 60 * 1000).toISOString(), icon: "MessageSquare" },
  { id: "a2", type: "qualification", description: "Enquiry from Chris Watkins auto-qualified → pushed to SM8 as HG-2024-0141", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), icon: "CheckCircle" },
  { id: "a3", type: "invoice", description: "Invoice paid: Amanda Price — Boiler Install £2,800 (HG-2024-0143)", timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(), icon: "PoundSterling" },
  { id: "a4", type: "enquiry", description: "New enquiry from Louise Edwards — Bathroom, CF15", timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), icon: "MessageSquare" },
  { id: "a5", type: "job", description: "Job HG-2024-0148 marked In Progress — Robert Evans Central Heating (Owen)", timestamp: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(), icon: "Wrench" },
  { id: "a6", type: "heatshield", description: "HeatShield reminder sent to Amanda Price — service 320 days ago", timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), icon: "Shield" },
  { id: "a7", type: "email", description: "Decline email sent to Steve Nash — outside service area (NP44)", timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), icon: "Mail" },
  { id: "a8", type: "qualification", description: "Enquiry from Priya Sharma qualified by Gareth → pushed to SM8 as HG-2024-0139", timestamp: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(), icon: "CheckCircle" },
  { id: "a9", type: "invoice", description: "Invoice paid: Helen Thomas — Power Flush £380 (HG-2024-0144) AWAITING", timestamp: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(), icon: "AlertCircle" },
  { id: "a10", type: "enquiry", description: "New enquiry from Rob Griffiths — Central Heating extension, CF83", timestamp: new Date(Date.now() - 15.5 * 60 * 60 * 1000).toISOString(), icon: "MessageSquare" },
  { id: "a11", type: "job", description: "Job HG-2024-0147 completed — Diane Collins Bathroom £1,840 (Karl)", timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), icon: "CheckCircle2" },
  { id: "a12", type: "heatshield", description: "HeatShield member Diane Collins — service due in 8 days", timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), icon: "Clock" },
];

// ─── Campaign Templates ───────────────────────────────────────────────────────
export const mockTemplates: CampaignTemplate[] = [
  {
    id: "t1", name: "Win-back: 15% Off Next Service", category: "Win-back",
    subject: "It's been a while — here's 15% off your next service",
    bodyPreview: "Hi {first_name}, we haven't seen you in a while and wanted to reach out...",
    body: `Hi {first_name},\n\nIt's been a while since we last saw you at HeatGlow, and we wanted to reach out.\n\nAs a valued previous customer, we'd love to welcome you back with 15% off your next service or repair.\n\nJust mention this email when you book and we'll take care of the rest.\n\nGive us a call on 07900 000000 or reply here to arrange a visit.\n\nWarm regards,\nGareth Jones\nHeatGlow Heating & Plumbing\nCardiff`,
    lastModified: "2024-03-15", tags: ["Win-back", "Discount"],
  },
  {
    id: "t2", name: "Lapsed Quote Re-engagement", category: "Win-back",
    subject: "Still thinking it over? Your quote is still available",
    bodyPreview: "Hi {first_name}, I noticed you haven't had a chance to get back to us about the quote...",
    body: `Hi {first_name},\n\nI noticed you haven't had a chance to get back to us about the quote we sent over for {last_job_type}. Completely understand — these things take time.\n\nYour quote reference is {quote_ref} and it's still valid. If you have any questions or want to adjust anything, just give me a shout.\n\nNo pressure at all — just didn't want you to miss out.\n\nCheers,\nGareth\nHeatGlow — 07900 000000`,
    lastModified: "2024-03-20", tags: ["Win-back", "Quote"],
  },
  {
    id: "t3", name: "HeatShield Renewal Reminder", category: "HeatShield",
    subject: "Your HeatGlow Protection Plan is due for renewal",
    bodyPreview: "Hi {first_name}, your HeatShield Protection Plan is coming up for renewal on {renewal_date}...",
    body: `Hi {first_name},\n\nYour HeatShield Protection Plan is coming up for renewal on {renewal_date}.\n\nAs a reminder, your plan covers you for:\n• Annual boiler service\n• Priority callouts\n• Parts and labour on covered repairs\n\nTo renew, simply reply to this email or call us on 07900 000000. It takes just 2 minutes.\n\nThanks for being a HeatShield member,\nGareth Jones\nHeatGlow`,
    lastModified: "2024-03-18", tags: ["HeatShield", "Renewal"],
  },
  {
    id: "t4", name: "HeatShield Cover Lapsed", category: "HeatShield",
    subject: "Your cover has lapsed — here's how to reinstate",
    bodyPreview: "Hi {first_name}, we noticed your HeatShield cover has lapsed...",
    body: `Hi {first_name},\n\nWe noticed your HeatShield cover has lapsed and we wanted to reach out before winter hits.\n\nWithout cover, boiler repairs can be expensive — the average emergency callout in Cardiff costs £180–£350.\n\nReinstate your plan today for just your original monthly amount, and we'll get you back under cover straight away.\n\nCall 07900 000000 or reply here to get started.\n\nBest wishes,\nGareth\nHeatGlow`,
    lastModified: "2024-02-28", tags: ["HeatShield", "Lapsed"],
  },
  {
    id: "t5", name: "Winter Prep Seasonal", category: "Seasonal",
    subject: "Is your boiler ready for winter?",
    bodyPreview: "Hi {first_name}, as the colder months approach, it's worth checking your boiler is ready...",
    body: `Hi {first_name},\n\nAs the colder months approach, it's worth making sure your boiler and heating system are ready for the season.\n\nA quick annual service can:\n• Prevent mid-winter breakdowns\n• Improve efficiency and lower bills\n• Keep your warranty valid\n\nWe're booking up fast for October and November — get in touch now to secure your slot.\n\nCall 07900 000000 or reply here.\n\nStay warm,\nGareth Jones\nHeatGlow Heating & Plumbing`,
    lastModified: "2024-01-10", tags: ["Seasonal", "Winter"],
  },
  {
    id: "t6", name: "Annual Service Reminder", category: "Service Reminder",
    subject: "Has your boiler had its annual service this year?",
    bodyPreview: "Hi {first_name}, just a friendly reminder that your boiler is due its annual service...",
    body: `Hi {first_name},\n\nJust a friendly reminder that your boiler is due its annual service — your last visit from us was {last_job_date}.\n\nAn annual service keeps your boiler running safely and efficiently, and is required to keep most manufacturer warranties valid.\n\nWe can usually book within 1–2 weeks. Get in touch to arrange a convenient time.\n\nCall 07900 000000 or reply to this email.\n\nThanks,\nGareth\nHeatGlow`,
    lastModified: "2024-03-05", tags: ["Service Reminder"],
  },
  {
    id: "t7", name: "One-time Customer Win-back", category: "Win-back",
    subject: "You haven't been back in a while — we'd love to help again",
    bodyPreview: "Hi {first_name}, we had the pleasure of helping you with {last_job_type} and wanted to check in...",
    body: `Hi {first_name},\n\nWe had the pleasure of helping you with {last_job_type} back in {last_job_date}, and we wanted to check in and say hi.\n\nIf you've got any heating or plumbing jobs coming up — or even just a boiler service overdue — we'd love to be your first call.\n\nExisting customers always get priority booking and we'll always be upfront about costs.\n\nGive us a call on 07900 000000 or reply here.\n\nTake care,\nGareth Jones\nHeatGlow`,
    lastModified: "2024-02-14", tags: ["Win-back", "Reactivation"],
  },
  {
    id: "t8", name: "Post-job HeatShield Upsell", category: "HeatShield",
    subject: "Protect your new boiler with HeatShield",
    bodyPreview: "Hi {first_name}, thanks for choosing HeatGlow for your recent {last_job_type}...",
    body: `Hi {first_name},\n\nThanks for choosing HeatGlow for your recent {last_job_type} — it was great to help.\n\nNow that your system is in great shape, it's the perfect time to protect your investment with our HeatShield Protection Plan.\n\nFor a low monthly cost, you get:\n• Annual boiler service (included)\n• Priority callout (no waiting weeks)\n• Parts and labour on covered faults\n\nReply here or call 07900 000000 to find out more — no obligation.\n\nBest,\nGareth\nHeatGlow`,
    lastModified: "2024-03-22", tags: ["HeatShield", "Upsell"],
  },
];

// ─── Automation Rules ─────────────────────────────────────────────────────────
export const mockAutomationRules: AutomationRule[] = [
  {
    id: "r1", name: "HeatShield Service Due", category: "HeatShield",
    triggerDescription: "When a HeatShield member has a service due in the next 14 days, create a reminder draft in the queue",
    isActive: true, timingValue: 14, timingUnit: "days", timingDirection: "before",
    templateId: "t3", templateName: "HeatShield Renewal Reminder",
    lastTriggered: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), draftsCreated: 8,
  },
  {
    id: "r2", name: "HeatShield Renewal Due", category: "HeatShield",
    triggerDescription: "When a HeatShield member's renewal date is within 30 days, create a renewal reminder draft",
    isActive: true, timingValue: 30, timingUnit: "days", timingDirection: "before",
    templateId: "t3", templateName: "HeatShield Renewal Reminder",
    lastTriggered: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), draftsCreated: 12,
  },
  {
    id: "r3", name: "HeatShield Cover Lapsed", category: "HeatShield",
    triggerDescription: "When a HeatShield member's renewal date passes with no renewal, create a lapsed cover draft after 7 days",
    isActive: true, timingValue: 7, timingUnit: "days", timingDirection: "after",
    templateId: "t4", templateName: "HeatShield Cover Lapsed",
    lastTriggered: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), draftsCreated: 5,
  },
  {
    id: "r4", name: "Quote Lapsed — No Response", category: "Quotes",
    triggerDescription: "When a quote has been sent with no conversion after 14 days, create a re-engagement draft",
    isActive: true, timingValue: 14, timingUnit: "days", timingDirection: "after",
    templateId: "t2", templateName: "Lapsed Quote Re-engagement",
    lastTriggered: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), draftsCreated: 15,
  },
  {
    id: "r5", name: "Customer Inactive", category: "Reactivation",
    triggerDescription: "When a customer has had no completed job in the last 12 months, create a win-back draft",
    isActive: false, timingValue: 12, timingUnit: "months", timingDirection: "after",
    templateId: "t1", templateName: "Win-back: 15% Off Next Service",
    lastTriggered: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), draftsCreated: 9,
  },
  {
    id: "r6", name: "One-time Customer Follow-up", category: "Reactivation",
    triggerDescription: "When a customer has exactly one completed job and nothing booked for 6 months, create a win-back draft",
    isActive: true, timingValue: 6, timingUnit: "months", timingDirection: "after",
    templateId: "t7", templateName: "One-time Customer Win-back",
    lastTriggered: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), draftsCreated: 7,
  },
];

// ─── Suppression List ─────────────────────────────────────────────────────────
export const mockSuppressionList: SuppressionEntry[] = [
  { id: "s1", email: "old.customer@yahoo.co.uk", name: "Brian Fletcher", dateAdded: "2024-01-14", source: "Unsubscribed via email link" },
  { id: "s2", email: "noemail@example.com", name: null, dateAdded: "2024-02-03", source: "Added manually" },
  { id: "s3", email: "margaret.jones@hotmail.com", name: "Margaret Jones", dateAdded: "2024-02-18", source: "Unsubscribed via email link" },
  { id: "s4", email: "donotcontact@gmail.com", name: null, dateAdded: "2024-03-01", source: "Added manually" },
  { id: "s5", email: "r.humphries@btinternet.com", name: "Richard Humphries", dateAdded: "2024-03-10", source: "Unsubscribed via email link" },
  { id: "s6", email: "alice.w@outlook.com", name: "Alice Watkins", dateAdded: "2024-03-22", source: "Unsubscribed via email link" },
];

// ─── Campaign Results ─────────────────────────────────────────────────────────
export const mockCampaignResults: Record<string, CampaignResult> = {
  camp3: {
    campaignId: "camp3", sentDate: "2024-04-01T09:00:00Z",
    totalRecipients: 8, delivered: 8, opened: 5, clicked: 2, bounced: 0, unsubscribed: 1,
    timelineData: [
      { time: "9:00", opens: 1, clicks: 0 }, { time: "10:00", opens: 2, clicks: 1 },
      { time: "11:00", opens: 1, clicks: 0 }, { time: "12:00", opens: 0, clicks: 0 },
      { time: "13:00", opens: 1, clicks: 1 }, { time: "14:00", opens: 0, clicks: 0 },
      { time: "15:00", opens: 0, clicks: 0 }, { time: "16:00", opens: 0, clicks: 0 },
      { time: "Day 2", opens: 0, clicks: 0 }, { time: "Day 3", opens: 0, clicks: 0 },
    ],
    recipients: [
      { id: "r1", name: "Tom Bradley", email: "tom.bradley@gmail.com", status: "Clicked", openedAt: "2024-04-01T09:12:00Z", clickedAt: "2024-04-01T09:14:00Z" },
      { id: "r2", name: "Priya Sharma", email: "priya.s@outlook.com", status: "Opened", openedAt: "2024-04-01T10:05:00Z", clickedAt: null },
      { id: "r3", name: "Callum Hughes", email: "callum.h@gmail.com", status: "Opened", openedAt: "2024-04-01T10:33:00Z", clickedAt: null },
      { id: "r4", name: "Sophie Allen", email: "sophie.allen@yahoo.co.uk", status: "Delivered", openedAt: null, clickedAt: null },
      { id: "r5", name: "Mark Thomas", email: "mark.t@outlook.com", status: "Clicked", openedAt: "2024-04-01T13:21:00Z", clickedAt: "2024-04-01T13:24:00Z" },
      { id: "r6", name: "Janet Price", email: "janet.price@gmail.com", status: "Opened", openedAt: "2024-04-01T11:08:00Z", clickedAt: null },
      { id: "r7", name: "Kevin Nash", email: "k.nash@sky.com", status: "Unsubscribed", openedAt: "2024-04-01T09:55:00Z", clickedAt: null },
      { id: "r8", name: "Donna Shaw", email: "donna.shaw@btinternet.com", status: "Delivered", openedAt: null, clickedAt: null },
    ],
  },
};

// ─── Queue Campaign Data (extended) ──────────────────────────────────────────
export const mockQueueCampaigns = [
  {
    id: "q1", name: "HeatShield Service Reminder — April 2026",
    triggerReason: "4 HeatShield members have a service due in the next 14 days",
    segment: "HeatShield members — service due within 14 days",
    recipientCount: 4,
    subject: "Your HeatShield annual service is due — book now",
    bodyPreview: "Hi {first_name}, just a quick note from Gareth at HeatGlow — your annual HeatShield boiler service is coming up...",
    autoGeneratedDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    category: "HeatShield Reminders" as const,
    recipients: [
      { name: "Sarah Morgan", email: "sarah.morgan@gmail.com", lastJobDate: "2025-04-10", renewalDate: "2026-05-01" },
      { name: "Lynne Davies", email: "lynne.davies@gmail.com", lastJobDate: "2025-03-22", renewalDate: "2026-04-28" },
      { name: "Helen Thomas", email: "helen.thomas@gmail.com", lastJobDate: "2025-02-15", renewalDate: "2026-05-05" },
      { name: "Karen Lloyd", email: "karen.lloyd@sky.com", lastJobDate: "2025-03-30", renewalDate: "2026-04-30" },
    ],
  },
  {
    id: "q2", name: "Lapsed Quote Follow-up — March Batch",
    triggerReason: "3 quotes sent 14+ days ago with no conversion or response",
    segment: "Customers with unanswered quotes (14+ days)",
    recipientCount: 3,
    subject: "Still thinking it over? Your quote is still available",
    bodyPreview: "Hi {first_name}, I noticed you haven't had a chance to get back to us about the quote we sent over...",
    autoGeneratedDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    category: "Lapsed Quotes" as const,
    recipients: [
      { name: "David Rees", email: "david.rees@hotmail.co.uk", lastJobDate: "2026-03-05", renewalDate: null },
      { name: "Mark Williams", email: "mark.w@outlook.com", lastJobDate: "2026-03-08", renewalDate: null },
      { name: "Paul Jones", email: "paul.j@icloud.com", lastJobDate: "2026-03-10", renewalDate: null },
    ],
  },
  {
    id: "q3", name: "Inactive Customer Win-back — Q1",
    triggerReason: "5 customers have had no activity in 12+ months",
    segment: "Customers inactive for 12+ months",
    recipientCount: 5,
    subject: "It's been a while — here's 15% off your next service",
    bodyPreview: "Hi {first_name}, it's been a while since we last saw you at HeatGlow, and we wanted to reach out...",
    autoGeneratedDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    category: "Reactivation" as const,
    recipients: [
      { name: "Robert Evans", email: "r.evans@yahoo.co.uk", lastJobDate: "2025-01-15", renewalDate: null },
      { name: "James Harris", email: "james.harris@gmail.com", lastJobDate: "2025-02-20", renewalDate: null },
      { name: "Diane Collins", email: "diane.c@hotmail.com", lastJobDate: "2024-12-10", renewalDate: null },
      { name: "Gareth Powell", email: "g.powell@btinternet.com", lastJobDate: "2024-11-05", renewalDate: null },
      { name: "Amanda Price", email: "amanda.price@btinternet.com", lastJobDate: "2025-01-30", renewalDate: null },
    ],
  },
];

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const mockCampaigns: Campaign[] = [
  {
    id: "camp1",
    name: "HeatShield Spring Service Reminder",
    status: "Pending Approval",
    subject: "Your HeatShield annual service is due — book now",
    segment: "HeatShield members with service overdue 305+ days",
    recipientCount: 2,
    scheduledDate: "2024-04-02",
    isAutoTriggered: true,
    approvalState: "Awaiting",
    previewBody: `Hi [First Name],\n\nJust a quick note from Gareth at HeatGlow — your annual HeatShield boiler service is coming up.\n\nAs a HeatShield member, your service is included in your monthly plan at no extra cost. It keeps your boiler running efficiently and your warranty valid.\n\nClick below to book a time that suits you, or reply to this email and we'll sort it out.\n\nThanks,\nGareth Jones\nHeatGlow Heating & Plumbing\n07900 000000`,
  },
  {
    id: "camp2",
    name: "March Quotes Gone Cold Follow-up",
    status: "Draft",
    subject: "Still thinking it over? We'd love to help you decide",
    segment: "Customers with quotes sent 14+ days with no response",
    recipientCount: 3,
    scheduledDate: "2024-04-05",
    isAutoTriggered: false,
    approvalState: "Awaiting",
    previewBody: `Hi [First Name],\n\nI noticed you haven't had a chance to get back to us about the quote we sent over. Completely understand — these things can take time.\n\nIf you have any questions or want to tweak anything, just give me a call or reply here. Happy to chat through the options.\n\nNo pressure at all — just didn't want you to miss out if you're still keen.\n\nCheers,\nGareth\nHeatGlow — 07900 000000`,
  },
  {
    id: "camp3",
    name: "New Enquiry Acknowledgement",
    status: "Sent",
    subject: "Thanks for getting in touch with HeatGlow",
    segment: "All new enquiry submissions (auto-send)",
    recipientCount: 8,
    scheduledDate: "2024-04-01",
    isAutoTriggered: true,
    approvalState: "Approved",
    previewBody: `Hi [First Name],\n\nThanks for getting in touch with HeatGlow. I've received your enquiry and will be in touch shortly — usually within a few hours during working hours.\n\nIf it's urgent, feel free to call me directly: 07900 000000.\n\nLooking forward to helping you,\nGareth Jones\nHeatGlow Heating & Plumbing\nCardiff`,
    sentDate: "2024-04-01", openRate: 63, clickRate: 25,
  },
  {
    id: "camp4",
    name: "Winter Prep — Oct 2025",
    status: "Sent",
    subject: "Is your boiler ready for winter?",
    segment: "All active customers",
    recipientCount: 47,
    scheduledDate: "2025-10-05",
    isAutoTriggered: false,
    approvalState: "Approved",
    previewBody: "Hi [First Name],\n\nAs the colder months approach, it's worth making sure your boiler and heating system are ready for the season...",
    sentDate: "2025-10-05", openRate: 48, clickRate: 12,
  },
  {
    id: "camp5",
    name: "HeatShield Renewal Reminder — Sept Batch",
    status: "Sent",
    subject: "Your HeatGlow Protection Plan is due for renewal",
    segment: "HeatShield — renewal due within 30 days",
    recipientCount: 11,
    scheduledDate: "2025-09-12",
    isAutoTriggered: true,
    approvalState: "Approved",
    previewBody: "Hi [First Name],\n\nYour HeatShield Protection Plan is coming up for renewal...",
    sentDate: "2025-09-12", openRate: 71, clickRate: 36,
  },
];

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────
export const dashboardKPIs = {
  revenuePaidMTD: 11245,
  revenuePaidMTDDelta: 18,
  awaitingPayment: 3640,
  awaitingPaymentDelta: -5,
  quotesSentMTD: 14,
  quotesSentMTDDelta: 8,
  quotesAcceptedMTD: 9,
  quotesAcceptedMTDDelta: 12,
  conversionRate: 64,
  quotesDeclinedMTD: 3,
  quotesDeclinedMTDDelta: -25,
  jobsCompletedMTD: 18,
  jobsCompletedMTDDelta: 10,
  heatShieldActive: 208,
  heatShieldActiveDelta: 3,
  heatShieldRevenue: 2080,
  newEnquiriesMTD: 23,
  newEnquiriesMTDDelta: 15,
};

export const quotePipelineData = [
  { month: "Oct", sent: 11, accepted: 7, declined: 2 },
  { month: "Nov", sent: 9, accepted: 5, declined: 3 },
  { month: "Dec", sent: 7, accepted: 4, declined: 1 },
  { month: "Jan", sent: 12, accepted: 8, declined: 2 },
  { month: "Feb", sent: 13, accepted: 8, declined: 3 },
  { month: "Mar", sent: 14, accepted: 9, declined: 3 },
];

export const enquiryQualityData = [
  { name: "Qualified", value: 14, color: "#22c55e" },
  { name: "Rejected", value: 4, color: "#ef4444" },
  { name: "Pending", value: 5, color: "#f59e0b" },
];

export const SERVICE_POSTCODES = ["CF3", "CF5", "CF10", "CF11", "CF14", "CF15", "CF23", "CF24", "CF38", "CF62", "CF63", "CF64", "CF83"];

export function isInServiceArea(postcode: string): boolean {
  const prefix = postcode.toUpperCase().replace(/\s/g, "").match(/^[A-Z]{1,2}\d{1,2}/)?.[0] || "";
  return SERVICE_POSTCODES.includes(prefix);
}
