// Applications — linking beneficiaries to schemes
import { beneficiaries } from './beneficiaries.js';
import { schemes } from './schemes.js';

const schemeIds = schemes.map(s => s.id);

// Multi-scheme overlap IDs (IDs 33-42 are enrolled in multiple schemes)
const multiSchemeMap = {
  33: [1, 2, 5],
  34: [4, 5, 9],
  35: [1, 7, 8],
  36: [3, 8, 9],
  37: [2, 6, 7],
  38: [1, 5, 10],
  39: [3, 5, 12],
  40: [4, 7, 9],
  41: [1, 2, 7],
  42: [3, 6, 8],
};

let appId = 1;
export const applications = [];

for (const b of beneficiaries) {
  const schemeList = multiSchemeMap[b.id] || [schemeIds[b.id % schemeIds.length]];
  for (const sid of schemeList) {
    applications.push({
      id: appId++,
      beneficiary_id: b.id,
      scheme_id: sid,
      submitted_at: b.created_at,
      status: b.status === 'flagged' ? 'under_review' : b.status,
      reviewed_by: b.status !== 'pending' ? 1 : null,
      reviewed_at: b.status !== 'pending' ? b.created_at : null,
    });
  }
}

// Recent audit logs
export const auditLogs = [
  { id:1,  user_id:1, action:'APPROVE_APPLICATION', entity_type:'application', entity_id:23, details:{ note:'Verified documents — approved' }, created_at:'2024-07-20T09:15:00' },
  { id:2,  user_id:2, action:'FLAG_BENEFICIARY',    entity_type:'beneficiary',  entity_id:1,  details:{ note:'Aadhaar duplicate flagged by AI' }, created_at:'2024-07-20T09:32:00' },
  { id:3,  user_id:1, action:'REJECT_APPLICATION',  entity_type:'application',  entity_id:14, details:{ note:'Income exceeds limit' }, created_at:'2024-07-20T10:01:00' },
  { id:4,  user_id:3, action:'VIEW_PREDICTION',     entity_type:'prediction',   entity_id:43, details:{ note:'Reviewed network ring cluster' }, created_at:'2024-07-20T10:45:00' },
  { id:5,  user_id:2, action:'FLAG_BENEFICIARY',    entity_type:'beneficiary',  entity_id:8,  details:{ note:'Shared bank account detected' }, created_at:'2024-07-20T11:10:00' },
  { id:6,  user_id:1, action:'APPROVE_APPLICATION', entity_type:'application',  entity_id:56, details:{ note:'Clean profile — approved' }, created_at:'2024-07-20T11:30:00' },
  { id:7,  user_id:4, action:'FILE_COMPLAINT',      entity_type:'complaint',    entity_id:1,  details:{ note:'Neighbor filed complaint about double-dipping' }, created_at:'2024-07-20T12:00:00' },
  { id:8,  user_id:2, action:'FLAG_BENEFICIARY',    entity_type:'beneficiary',  entity_id:43, details:{ note:'Network ring of 10 detected in Lucknow' }, created_at:'2024-07-20T14:20:00' },
];

// Complaints
export const complaints = [
  { id:1, filed_by:4, beneficiary_id:1,  complaint_type:'duplicate_application', description:'This person has applied under two different names in our block', status:'open',     created_at:'2024-07-15' },
  { id:2, filed_by:5, beneficiary_id:43, complaint_type:'fraud_ring',            description:'Entire Gupta family group is fraudulently claiming benefits', status:'investigating', created_at:'2024-07-18' },
  { id:3, filed_by:4, beneficiary_id:13, complaint_type:'income_falsification',  description:'This applicant owns a shop and earns much more than declared', status:'resolved',  created_at:'2024-07-05' },
  { id:4, filed_by:6, beneficiary_id:8,  complaint_type:'fake_beneficiary',      description:'Three people claiming to the same bank account in this district', status:'open',   created_at:'2024-07-20' },
];

// Demo users
export const users = [
  { id:1, name:'Admin Singh',        email:'admin@gov.in',     role:'admin',              district_id:null, avatar:'AS' },
  { id:2, name:'District Officer Rao',email:'do.rao@gov.in',   role:'district_officer',   district_id:15,   avatar:'DR' },
  { id:3, name:'Verifying Officer K', email:'vo.k@gov.in',     role:'verifying_officer',  district_id:6,    avatar:'VK' },
  { id:4, name:'Citizen User',        email:'citizen@gmail.com',role:'citizen',            district_id:6,    avatar:'CU' },
];

// Fraud logs
export const fraudLogs = [
  { id:1,  beneficiary_id:1,  fraud_type:'duplicate_aadhaar',   detected_by:'ai',     resolved:false, resolution_notes:null,                          created_at:'2024-01-15' },
  { id:2,  beneficiary_id:2,  fraud_type:'duplicate_aadhaar',   detected_by:'ai',     resolved:false, resolution_notes:null,                          created_at:'2024-01-15' },
  { id:3,  beneficiary_id:3,  fraud_type:'duplicate_aadhaar',   detected_by:'ai',     resolved:false, resolution_notes:null,                          created_at:'2024-01-15' },
  { id:4,  beneficiary_id:4,  fraud_type:'duplicate_aadhaar',   detected_by:'ai',     resolved:true,  resolution_notes:'Verified — same person, second record removed', created_at:'2024-02-05' },
  { id:5,  beneficiary_id:8,  fraud_type:'shared_bank_account', detected_by:'ai',     resolved:false, resolution_notes:null,                          created_at:'2024-02-25' },
  { id:6,  beneficiary_id:13, fraud_type:'income_mismatch',     detected_by:'ai',     resolved:true,  resolution_notes:'Income verified — application rejected', created_at:'2024-03-12' },
  { id:7,  beneficiary_id:43, fraud_type:'fraud_ring',          detected_by:'ai',     resolved:false, resolution_notes:null,                          created_at:'2024-06-01' },
  { id:8,  beneficiary_id:23, fraud_type:'fuzzy_duplicate',     detected_by:'ai',     resolved:false, resolution_notes:null,                          created_at:'2024-04-10' },
  { id:9,  beneficiary_id:15, fraud_type:'income_mismatch',     detected_by:'manual', resolved:true,  resolution_notes:'Applicant withdrew application voluntarily', created_at:'2024-03-20' },
  { id:10, beneficiary_id:33, fraud_type:'multi_scheme_overlap', detected_by:'ai',    resolved:false, resolution_notes:null,                          created_at:'2024-05-05' },
];
