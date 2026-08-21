// Central data barrel — import everything from here
export { districts } from './districts.js';
export { schemes } from './schemes.js';
export { beneficiaries } from './beneficiaries.js';
export { 
  predictions, 
  predictionsByBeneficiary, 
  getDashboardSummary, 
  fraudTrend, 
  leakageTrend, 
  districtFraudData, 
  districtLeakageData, 
  networkGraphData, 
  CONCERN_ACTIONS 
} from './predictions.js';
export { applications, auditLogs, complaints, users, fraudLogs } from './applications.js';
