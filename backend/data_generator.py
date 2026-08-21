import os
import csv
import json

DATASET_TEXT = """application_id,scheme,state,district,age,gender,annual_income,family_size,employment_status,aadhaar_duplicate,mobile_duplicate,email_duplicate,bank_account_duplicate,multiple_scheme_applications,document_mismatch,previous_rejection,eligibility_match,risk_score,fraud,application_status,application_date
APP2026000001,Old Age Pension,Uttar Pradesh,Lucknow,70,Female,93302,7,Student,0,0,0,0,0,1,0,1,10.3,0,Approved,2026-01-25
APP2026000002,Education Scholarship,Andhra Pradesh,Guntur,60,Other,47455,2,Farmer,0,0,0,0,0,0,0,1,1.4,0,Approved,2025-10-05
APP2026000003,Disability Pension,West Bengal,Kolkata,30,Female,126999,3,Farmer,0,0,0,0,0,0,0,1,1.1,0,Approved,2025-11-23
APP2026000004,PMFBY,Uttar Pradesh,Prayagraj,75,Male,102265,2,Farmer,0,0,0,0,0,0,0,1,0.0,0,Pending,2025-06-12
APP2026000005,PMFBY,Tamil Nadu,Salem,75,Female,76391,4,Unemployed,0,0,1,0,0,0,0,1,5.3,0,Approved,2025-02-07
APP2026000006,Education Scholarship,Gujarat,Ahmedabad,20,Male,135316,3,Daily Wage,0,0,0,0,1,0,0,1,7.0,0,Pending,2025-01-20
APP2026000007,Housing Assistance,Uttar Pradesh,Varanasi,19,Male,23113,7,Student,0,0,0,0,0,0,0,1,1.4,0,Approved,2026-02-19
APP2026000008,Disability Pension,Uttar Pradesh,Lucknow,32,Female,59998,7,Self-Employed,0,1,0,0,0,0,1,1,13.5,1,Pending,2026-02-03
APP2026000009,Widow Pension,Tamil Nadu,Tiruchirappalli,64,Female,46562,8,Daily Wage,0,0,0,0,0,0,0,1,3.3,0,Approved,2026-04-07
APP2026000010,Farmer Welfare,Andhra Pradesh,Vijayawada,52,Female,50333,4,Farmer,0,0,0,0,0,0,0,1,0.7,0,Approved,2025-07-14
APP2026000011,Disability Pension,Kerala,Ernakulam,47,Male,80184,5,Student,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-05-17
APP2026000012,PMFBY,Rajasthan,Jaipur,42,Male,45481,7,Self-Employed,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-09-17
APP2026000013,Student Financial Assistance,Maharashtra,Pune,45,Female,316567,6,Salaried,0,0,0,0,1,0,0,1,6.1,0,Pending,2025-01-02
APP2026000014,Education Scholarship,West Bengal,Howrah,54,Male,126287,8,Farmer,0,0,0,0,0,0,0,1,0.0,0,Pending,2026-03-11
APP2026000015,Old Age Pension,Andhra Pradesh,Visakhapatnam,21,Male,49602,8,Salaried,0,0,0,0,0,0,0,0,7.6,0,Pending,2025-03-08
APP2026000016,Student Financial Assistance,Karnataka,Kalaburagi,52,Female,24398,1,Daily Wage,0,0,0,0,0,0,0,1,5.4,0,Under Review,2025-12-02
APP2026000017,Housing Assistance,Telangana,Warangal,30,Female,58104,2,Self-Employed,0,0,0,0,0,0,0,1,1.0,0,Approved,2026-08-06
APP2026000018,Farmer Welfare,Tamil Nadu,Coimbatore,63,Male,70283,6,Farmer,0,0,0,0,0,0,0,1,0.0,0,Approved,2026-03-12
APP2026000019,Education Scholarship,West Bengal,Darjeeling,29,Male,55902,1,Self-Employed,0,0,0,0,1,0,0,1,3.0,0,Pending,2025-06-08
APP2026000020,Farmer Welfare,Maharashtra,Pune,22,Female,605875,1,Student,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-12-19
APP2026000021,LPG Subsidy,Uttar Pradesh,Varanasi,43,Female,26028,2,Farmer,0,0,0,0,0,0,0,1,1.8,0,Approved,2025-09-06
APP2026000022,PMFBY,Kerala,Kozhikode,43,Male,93512,1,Salaried,0,0,0,0,0,0,0,1,0.0,0,Pending,2026-04-10
APP2026000023,PMFBY,Gujarat,Ahmedabad,48,Female,81643,6,Self-Employed,1,0,0,0,1,1,0,1,19.1,1,Pending,2025-10-31
APP2026000024,Education Scholarship,Rajasthan,Kota,67,Male,74661,3,Farmer,0,0,0,1,0,0,0,1,10.3,0,Pending,2025-04-01
APP2026000025,Farmer Welfare,Uttar Pradesh,Lucknow,58,Female,21016,8,Student,0,0,0,0,0,0,0,1,0.0,0,Under Review,2026-01-31
APP2026000026,Disability Pension,Tamil Nadu,Chennai,39,Female,87159,1,Farmer,0,0,0,0,0,0,0,1,0.0,0,Under Review,2025-10-15
APP2026000027,Old Age Pension,Andhra Pradesh,Visakhapatnam,60,Female,103040,4,Unemployed,0,0,0,0,0,0,0,1,2.1,0,Approved,2026-03-25
APP2026000028,LPG Subsidy,Tamil Nadu,Coimbatore,47,Female,153251,6,Student,0,0,0,0,0,0,0,1,4.1,0,Pending,2026-07-05
APP2026000029,Student Financial Assistance,Tamil Nadu,Madurai,30,Male,129311,3,Self-Employed,0,1,1,0,0,1,0,1,17.9,1,Under Review,2025-06-04
APP2026000030,Farmer Welfare,Maharashtra,Aurangabad,19,Male,224415,6,Salaried,0,0,0,0,0,0,0,0,2.5,1,Pending,2025-09-26
APP2026000031,Student Financial Assistance,Uttar Pradesh,Agra,18,Female,19398,7,Farmer,0,0,0,0,0,0,0,1,4.7,0,Approved,2025-11-26
APP2026000032,Disability Pension,Gujarat,Ahmedabad,31,Male,75458,6,Self-Employed,0,0,0,0,0,0,1,1,2.5,0,Approved,2025-10-01
APP2026000033,LPG Subsidy,Kerala,Thrissur,65,Female,588860,5,Daily Wage,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-03-30
APP2026000034,Education Scholarship,Kerala,Kozhikode,44,Male,199314,5,Unemployed,0,0,0,0,0,0,0,1,0.0,0,Approved,2026-05-19
APP2026000035,Education Scholarship,Andhra Pradesh,Guntur,44,Male,30257,8,Daily Wage,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-09-11
APP2026000036,Disability Pension,Tamil Nadu,Sivaganga,41,Female,96150,7,Farmer,0,0,0,0,0,0,0,1,0.9,0,Approved,2025-09-06
APP2026000037,Farmer Welfare,Tamil Nadu,Erode,32,Male,41028,1,Student,0,0,0,0,1,0,0,1,3.2,0,Approved,2025-09-18
APP2026000038,PM-KISAN,Andhra Pradesh,Vijayawada,59,Female,65115,7,Student,0,0,0,0,0,0,0,1,0.0,1,Pending,2025-11-03
APP2026000039,LPG Subsidy,Karnataka,Hubballi-Dharwad,18,Male,403249,2,Student,0,0,0,0,0,0,0,1,0.0,0,Under Review,2025-07-18
APP2026000040,Education Scholarship,Maharashtra,Nashik,53,Male,184690,7,Unemployed,0,0,0,0,0,0,0,0,7.5,1,Rejected,2025-10-25
APP2026000041,Student Financial Assistance,Andhra Pradesh,Guntur,72,Male,28785,3,Farmer,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-11-22
APP2026000042,Disability Pension,West Bengal,Kolkata,69,Male,50698,6,Student,0,1,0,0,0,0,0,1,6.6,0,Approved,2025-04-03
APP2026000043,PMFBY,Uttar Pradesh,Agra,39,Female,90055,6,Self-Employed,0,1,0,0,0,0,0,1,4.6,0,Approved,2026-05-09
APP2026000044,Student Financial Assistance,Karnataka,Mysuru,67,Male,73815,3,Farmer,0,0,0,0,0,0,0,1,0.5,0,Approved,2025-07-21
APP2026000045,Student Financial Assistance,West Bengal,North 24 Parganas,31,Male,113833,8,Self-Employed,0,0,0,0,0,0,0,1,0.0,0,Approved,2026-08-02
APP2026000046,LPG Subsidy,Uttar Pradesh,Kanpur Nagar,31,Female,50352,5,Farmer,0,0,0,0,0,1,0,1,2.2,0,Pending,2026-03-25
APP2026000047,Old Age Pension,Kerala,Thiruvananthapuram,37,Male,68384,4,Salaried,0,0,0,0,1,0,0,0,12.3,0,Pending,2025-10-25
APP2026000048,Housing Assistance,Karnataka,Kalaburagi,19,Male,49914,4,Student,1,1,0,0,1,0,0,1,23.2,1,Pending,2025-05-01
APP2026000049,Disability Pension,Maharashtra,Nagpur,33,Female,68312,3,Self-Employed,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-12-06
APP2026000050,Disability Pension,Tamil Nadu,Coimbatore,67,Female,152587,1,Daily Wage,0,1,0,0,0,0,0,1,3.3,0,Under Review,2025-10-03
APP2026000051,Farmer Welfare,Tamil Nadu,Chennai,62,Male,112434,8,Student,1,1,1,0,1,0,0,1,27.5,1,Under Review,2025-03-17
APP2026000052,LPG Subsidy,Tamil Nadu,Coimbatore,37,Female,53188,7,Student,0,0,0,0,0,0,0,1,0.1,0,Approved,2026-03-27
APP2026000053,Education Scholarship,Uttar Pradesh,Lucknow,36,Male,210405,7,Self-Employed,0,0,0,0,0,0,0,1,0.4,0,Approved,2025-03-22
APP2026000054,Old Age Pension,Maharashtra,Aurangabad,38,Male,199859,8,Salaried,0,0,0,0,0,0,0,1,5.3,0,Approved,2026-07-07
APP2026000055,Housing Assistance,Uttar Pradesh,Lucknow,24,Male,89925,5,Self-Employed,0,0,0,0,0,0,0,1,0.0,0,Approved,2026-07-22
APP2026000056,Farmer Welfare,Uttar Pradesh,Lucknow,27,Female,74163,8,Self-Employed,0,0,0,0,0,1,0,1,2.6,0,Approved,2026-07-24
APP2026000057,Old Age Pension,Andhra Pradesh,Kurnool,75,Male,337550,8,Daily Wage,0,0,0,0,0,0,0,1,0.0,0,Pending,2025-02-17
APP2026000058,Housing Assistance,Telangana,Karimnagar,58,Female,300365,2,Self-Employed,0,1,0,0,0,0,0,1,8.7,0,Approved,2025-11-20
APP2026000059,Education Scholarship,Tamil Nadu,Coimbatore,57,Male,28893,4,Daily Wage,0,0,0,0,0,0,0,0,2.6,0,Approved,2025-06-07
APP2026000060,Widow Pension,Tamil Nadu,Tiruchirappalli,34,Male,220419,1,Farmer,0,0,0,0,0,0,1,0,7.4,0,Under Review,2026-04-18
APP2026000061,Education Scholarship,Maharashtra,Nagpur,67,Female,327881,6,Self-Employed,0,0,0,0,0,0,0,1,0.0,0,Pending,2025-10-01
APP2026000062,Disability Pension,Andhra Pradesh,Guntur,28,Other,147273,1,Unemployed,0,0,0,0,1,1,0,1,7.1,0,Pending,2025-04-18
APP2026000063,Disability Pension,Telangana,Warangal,74,Male,63410,7,Daily Wage,1,1,1,0,1,0,0,1,22.7,1,Rejected,2025-10-21
APP2026000064,Farmer Welfare,Uttar Pradesh,Prayagraj,47,Male,69446,7,Self-Employed,0,0,0,0,0,0,0,1,2.8,0,Approved,2025-05-30
APP2026000065,LPG Subsidy,Maharashtra,Aurangabad,37,Female,324658,4,Salaried,0,0,0,0,1,0,0,1,3.5,0,Approved,2025-04-14
APP2026000066,PMFBY,Telangana,Nizamabad,61,Female,168406,6,Student,0,0,0,0,0,0,0,1,0.0,0,Approved,2026-08-14
APP2026000067,Student Financial Assistance,Telangana,Karimnagar,42,Male,135673,8,Self-Employed,0,0,0,0,0,0,1,1,3.9,0,Approved,2026-08-13
APP2026000068,Old Age Pension,Karnataka,Bengaluru Urban,33,Male,517700,7,Farmer,0,0,0,0,1,0,0,1,0.5,0,Pending,2026-08-09
APP2026000069,Disability Pension,Tamil Nadu,Tiruchirappalli,57,Female,42268,4,Farmer,0,0,0,0,0,0,0,1,3.1,0,Under Review,2025-03-07
APP2026000070,Disability Pension,Andhra Pradesh,Kurnool,59,Male,84078,8,Farmer,0,0,1,0,0,0,0,1,3.6,0,Approved,2025-06-23
APP2026000071,PMFBY,Tamil Nadu,Salem,52,Male,103784,1,Daily Wage,0,0,1,0,1,0,0,1,9.5,0,Approved,2025-02-01
APP2026000072,PM-KISAN,Kerala,Thrissur,44,Male,76793,2,Self-Employed,0,0,0,0,0,0,1,0,9.5,0,Approved,2026-07-12
APP2026000073,LPG Subsidy,West Bengal,Howrah,37,Male,22636,3,Unemployed,0,0,0,0,0,0,0,1,2.8,0,Approved,2025-10-22
APP2026000074,Disability Pension,Karnataka,Kalaburagi,41,Female,191084,3,Farmer,0,0,0,1,1,0,1,1,15.6,0,Pending,2026-01-29
APP2026000075,LPG Subsidy,Tamil Nadu,Tiruppur,68,Male,51234,6,Student,0,0,0,0,1,1,0,1,5.0,0,Approved,2025-01-24
APP2026000076,PM-KISAN,Karnataka,Belagavi,38,Female,50550,7,Daily Wage,0,0,0,0,0,0,0,1,0.0,0,Under Review,2026-03-25
APP2026000077,Housing Assistance,Karnataka,Belagavi,74,Male,68753,1,Farmer,0,1,0,1,0,1,0,1,19.6,1,Pending,2025-04-30
APP2026000078,Education Scholarship,Maharashtra,Nagpur,26,Male,75727,3,Self-Employed,0,0,0,0,0,1,1,1,5.9,0,Pending,2025-11-04
APP2026000079,Student Financial Assistance,Telangana,Warangal,27,Female,82161,7,Farmer,0,1,0,0,1,0,0,1,10.7,0,Under Review,2025-03-25
APP2026000080,Disability Pension,Uttar Pradesh,Varanasi,37,Male,185414,5,Farmer,0,1,1,0,0,0,0,1,11.0,0,Approved,2025-07-22
APP2026000081,LPG Subsidy,Maharashtra,Aurangabad,18,Male,216252,3,Self-Employed,0,0,0,0,0,1,0,1,2.9,0,Approved,2025-01-17
APP2026000082,Farmer Welfare,Kerala,Thiruvananthapuram,68,Male,74092,4,Self-Employed,0,0,0,0,0,0,0,1,0.9,0,Under Review,2025-10-10
APP2026000083,Education Scholarship,West Bengal,Kolkata,37,Female,57467,5,Farmer,1,0,0,0,1,1,1,0,27.1,1,Under Review,2026-06-24
APP2026000084,Disability Pension,Tamil Nadu,Erode,23,Female,81737,5,Student,0,0,0,0,0,0,0,1,4.0,0,Approved,2026-06-07
APP2026000085,PMFBY,Tamil Nadu,Madurai,53,Female,46042,7,Student,0,0,0,0,0,0,1,1,6.5,0,Pending,2025-12-26
APP2026000086,PMFBY,Tamil Nadu,Salem,73,Female,88106,8,Farmer,0,0,0,0,0,0,0,1,0.0,0,Under Review,2025-02-05
APP2026000087,PM-KISAN,Uttar Pradesh,Kanpur Nagar,75,Male,44266,7,Unemployed,0,0,0,0,0,1,0,1,8.8,1,Rejected,2025-10-10
APP2026000088,Widow Pension,Andhra Pradesh,Guntur,24,Female,443734,1,Daily Wage,0,0,0,0,0,0,0,1,0.6,0,Approved,2025-05-11
APP2026000089,PM-KISAN,Tamil Nadu,Chennai,63,Male,99062,4,Farmer,0,0,0,0,0,0,0,1,0.7,0,Approved,2026-07-29
APP2026000090,Widow Pension,Telangana,Warangal,38,Male,60126,4,Student,0,0,0,0,0,0,0,1,1.4,0,Approved,2025-11-10
APP2026000091,PMFBY,Tamil Nadu,Tiruchirappalli,66,Male,152812,6,Farmer,0,0,0,0,0,0,0,1,0.6,0,Pending,2025-07-18
APP2026000092,Disability Pension,Uttar Pradesh,Varanasi,53,Male,35722,8,Farmer,0,0,0,0,0,0,0,1,1.7,0,Approved,2025-01-21
APP2026000093,Farmer Welfare,Andhra Pradesh,Guntur,60,Male,52780,4,Unemployed,0,0,0,0,0,0,1,1,4.7,0,Approved,2025-09-10
APP2026000094,PM-KISAN,Kerala,Kozhikode,66,Male,123675,3,Farmer,0,0,0,0,0,0,0,1,0.8,0,Approved,2025-10-26
APP2026000095,Housing Assistance,Karnataka,Mysuru,69,Female,99618,8,Salaried,0,0,0,1,0,0,0,1,11.4,0,Approved,2025-01-07
APP2026000096,Education Scholarship,Maharashtra,Nagpur,26,Female,197627,6,Salaried,0,0,0,1,0,0,0,1,10.8,0,Approved,2025-05-20
APP2026000097,Old Age Pension,Kerala,Thrissur,59,Female,11619,4,Salaried,0,0,0,0,0,0,0,1,0.0,0,Pending,2026-03-13
APP2026000098,Housing Assistance,Tamil Nadu,Tiruppur,26,Male,166235,8,Self-Employed,0,0,0,0,0,0,0,1,0.0,0,Under Review,2025-01-01
APP2026000099,Student Financial Assistance,Tamil Nadu,Chennai,72,Male,59877,3,Student,0,0,0,0,0,1,0,1,4.6,1,Under Review,2026-01-25
APP2026000100,Student Financial Assistance,Gujarat,Vadodara,54,Female,37417,2,Salaried,0,0,0,0,1,1,0,1,6.4,0,Pending,2026-01-04
APP2026000101,Farmer Welfare,Rajasthan,Jodhpur,29,Male,24716,1,Salaried,0,1,0,0,0,0,0,1,11.2,0,Approved,2026-07-27
APP2026000102,Disability Pension,Uttar Pradesh,Lucknow,34,Male,59326,1,Self-Employed,0,0,0,0,1,0,0,1,3.6,0,Approved,2026-02-15
APP2026000103,Old Age Pension,Karnataka,Belagavi,69,Male,296573,7,Farmer,0,0,0,0,0,0,0,1,2.2,0,Pending,2025-11-24
APP2026000104,Disability Pension,Gujarat,Ahmedabad,55,Male,186167,1,Farmer,0,0,0,0,0,0,0,1,0.0,0,Pending,2026-07-20
APP2026000105,Student Financial Assistance,Uttar Pradesh,Kanpur Nagar,31,Male,306613,7,Farmer,0,0,0,0,1,0,0,1,5.3,1,Pending,2025-03-20
APP2026000106,Widow Pension,Uttar Pradesh,Prayagraj,65,Female,82635,1,Farmer,1,0,0,0,0,0,0,1,7.1,0,Approved,2025-05-20
APP2026000107,Widow Pension,Andhra Pradesh,Kurnool,59,Female,97504,2,Self-Employed,0,0,0,0,1,1,0,1,13.0,1,Pending,2025-03-03
APP2026000108,Widow Pension,Karnataka,Hubballi-Dharwad,22,Other,27532,3,Salaried,0,0,0,0,0,0,0,1,1.3,0,Approved,2026-02-12
APP2026000109,PM-KISAN,Tamil Nadu,Sivaganga,34,Male,27528,2,Daily Wage,0,0,0,0,0,0,0,1,3.1,0,Pending,2026-05-01
APP2026000110,Disability Pension,Rajasthan,Udaipur,66,Male,80632,2,Daily Wage,0,0,0,0,0,1,0,1,5.3,0,Approved,2025-11-23
APP2026000111,LPG Subsidy,Andhra Pradesh,Vijayawada,38,Female,32062,8,Salaried,0,0,0,0,0,1,0,1,3.5,0,Approved,2026-03-06
APP2026000112,Disability Pension,Tamil Nadu,Coimbatore,20,Male,47319,4,Daily Wage,0,0,0,0,0,0,0,1,0.0,0,Approved,2026-03-19
APP2026000113,PMFBY,Karnataka,Belagavi,53,Female,92969,4,Self-Employed,0,0,0,0,0,0,0,1,2.0,0,Approved,2026-04-01
APP2026000114,Disability Pension,Maharashtra,Mumbai,70,Female,233706,7,Salaried,0,0,0,0,0,0,0,1,0.0,0,Approved,2026-01-05
APP2026000115,Education Scholarship,Tamil Nadu,Tiruppur,50,Male,90667,8,Student,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-06-18
APP2026000116,Disability Pension,West Bengal,Howrah,74,Male,32446,3,Unemployed,0,0,0,0,0,1,0,1,2.0,0,Approved,2026-05-22
APP2026000117,Student Financial Assistance,Uttar Pradesh,Prayagraj,24,Male,22953,4,Farmer,0,0,0,0,0,0,0,1,1.2,0,Approved,2025-04-07
APP2026000118,Disability Pension,Uttar Pradesh,Prayagraj,56,Female,98469,4,Daily Wage,0,0,0,0,0,0,1,1,5.3,0,Pending,2025-11-18
APP2026000119,Student Financial Assistance,Andhra Pradesh,Vijayawada,55,Male,56148,3,Self-Employed,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-02-12
APP2026000120,PMFBY,Maharashtra,Aurangabad,75,Male,98192,2,Self-Employed,0,0,0,0,0,0,0,1,0.0,0,Under Review,2025-01-11
APP2026000121,Education Scholarship,Maharashtra,Nashik,48,Male,77222,8,Self-Employed,0,0,0,0,0,0,1,1,6.0,0,Under Review,2025-10-01
APP2026000122,Old Age Pension,Maharashtra,Aurangabad,65,Female,85368,6,Farmer,0,0,0,0,0,0,0,1,0.0,0,Pending,2025-10-06
APP2026000123,Widow Pension,Tamil Nadu,Chennai,26,Female,221626,6,Salaried,0,0,0,0,1,1,0,1,15.8,1,Rejected,2025-06-25
APP2026000124,Student Financial Assistance,Andhra Pradesh,Vijayawada,20,Female,198350,3,Student,0,0,0,0,0,0,1,1,5.1,0,Under Review,2026-01-20
APP2026000125,Housing Assistance,Tamil Nadu,Tiruppur,59,Female,118682,6,Self-Employed,0,0,1,0,0,0,0,1,7.3,0,Approved,2026-05-14
APP2026000126,Widow Pension,Telangana,Karimnagar,18,Male,45990,2,Salaried,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-11-22
APP2026000127,Disability Pension,Kerala,Ernakulam,68,Male,59524,1,Self-Employed,0,0,1,0,0,0,0,1,3.5,0,Approved,2026-07-11
APP2026000128,PMFBY,Tamil Nadu,Chennai,19,Male,159532,8,Salaried,0,0,0,0,0,0,1,1,5.5,0,Approved,2025-06-22
APP2026000129,Housing Assistance,Tamil Nadu,Madurai,57,Female,238856,2,Farmer,0,0,0,0,0,0,0,1,0.0,0,Pending,2025-05-14
APP2026000130,Widow Pension,Maharashtra,Nagpur,44,Female,34623,7,Student,0,0,0,0,0,0,0,1,0.0,1,Rejected,2026-07-03
APP2026000131,Old Age Pension,Tamil Nadu,Tiruchirappalli,55,Male,283002,3,Farmer,0,0,0,0,0,0,0,1,0.0,0,Approved,2026-02-03
APP2026000132,Housing Assistance,Rajasthan,Udaipur,54,Female,50149,6,Unemployed,0,0,0,0,1,0,0,1,6.1,0,Pending,2026-06-30
APP2026000133,Disability Pension,Maharashtra,Mumbai,43,Male,148621,5,Salaried,0,0,1,0,0,0,0,1,4.7,0,Pending,2026-04-04
APP2026000134,Disability Pension,Kerala,Ernakulam,45,Female,735539,6,Salaried,0,0,0,0,0,0,0,1,0.0,0,Approved,2026-03-29
APP2026000135,Disability Pension,Maharashtra,Pune,47,Female,27318,8,Self-Employed,0,0,0,0,0,0,0,1,5.0,0,Approved,2026-07-29
APP2026000136,Disability Pension,Tamil Nadu,Tiruppur,57,Female,131461,4,Farmer,0,0,0,0,0,0,0,1,0.0,0,Approved,2026-04-14
APP2026000137,Farmer Welfare,Gujarat,Ahmedabad,59,Female,71118,7,Student,0,1,0,0,1,1,0,1,19.2,0,Approved,2026-05-20
APP2026000138,PM-KISAN,Andhra Pradesh,Visakhapatnam,44,Female,125869,3,Self-Employed,0,0,0,0,1,0,0,1,9.2,1,Rejected,2025-01-11
APP2026000139,Student Financial Assistance,Uttar Pradesh,Kanpur Nagar,38,Female,56576,8,Farmer,0,0,0,0,0,0,0,1,0.0,0,Pending,2026-06-05
APP2026000140,Farmer Welfare,Tamil Nadu,Chennai,20,Female,14016,4,Daily Wage,0,0,0,0,0,0,0,1,1.4,0,Approved,2025-09-26
APP2026000141,Housing Assistance,Andhra Pradesh,Guntur,63,Male,51134,7,Salaried,0,0,0,0,0,0,0,1,0.0,0,Pending,2025-04-28
APP2026000142,PM-KISAN,Telangana,Nizamabad,31,Male,116753,7,Student,0,0,0,0,1,1,0,1,13.0,0,Approved,2026-07-21
APP2026000143,Disability Pension,Rajasthan,Kota,43,Female,247577,6,Daily Wage,0,0,0,0,0,0,0,1,2.1,0,Pending,2025-03-11
APP2026000144,Disability Pension,Maharashtra,Aurangabad,75,Female,121993,8,Self-Employed,0,0,0,1,0,0,0,1,5.2,1,Pending,2025-08-17
APP2026000145,Student Financial Assistance,Andhra Pradesh,Vijayawada,63,Female,271613,6,Farmer,0,0,0,0,0,0,0,1,0.0,0,Approved,2026-05-30
APP2026000146,PMFBY,Karnataka,Mysuru,38,Male,62161,5,Student,0,0,0,0,0,1,0,1,2.5,0,Approved,2026-08-09
APP2026000147,Disability Pension,Kerala,Ernakulam,45,Male,58482,3,Self-Employed,0,0,0,0,0,0,0,1,1.5,0,Under Review,2026-06-19
APP2026000148,Housing Assistance,Telangana,Karimnagar,36,Male,116410,4,Daily Wage,0,1,0,0,0,0,0,1,5.0,0,Approved,2026-07-25
APP2026000149,PMFBY,Andhra Pradesh,Guntur,54,Female,67935,1,Student,1,1,0,0,1,0,0,1,17.0,1,Under Review,2025-03-08
APP2026000150,Widow Pension,Tamil Nadu,Coimbatore,26,Male,208865,6,Farmer,0,0,0,0,0,0,0,1,1.0,0,Approved,2025-06-20
APP2026000151,Farmer Welfare,West Bengal,Darjeeling,73,Male,31363,5,Farmer,0,1,0,0,1,0,0,1,9.1,0,Approved,2025-05-06
APP2026000152,Housing Assistance,Rajasthan,Kota,75,Male,171886,6,Daily Wage,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-10-01
APP2026000153,PM-KISAN,Tamil Nadu,Coimbatore,35,Male,222701,6,Student,1,0,0,0,0,0,0,0,13.4,1,Rejected,2025-04-12
APP2026000154,Widow Pension,Telangana,Nizamabad,31,Male,118348,2,Daily Wage,1,0,0,0,0,1,0,0,19.5,1,Rejected,2025-03-30
APP2026000155,Housing Assistance,Tamil Nadu,Salem,49,Female,178458,8,Farmer,0,0,0,0,0,0,0,1,0.6,0,Under Review,2026-02-08
APP2026000156,LPG Subsidy,Maharashtra,Mumbai,55,Male,55308,4,Salaried,0,0,0,0,1,1,0,1,12.0,0,Approved,2025-05-11
APP2026000157,LPG Subsidy,Karnataka,Bengaluru Urban,55,Male,48243,6,Student,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-07-07
APP2026000158,Housing Assistance,Maharashtra,Nashik,20,Male,117209,2,Farmer,0,0,0,1,0,0,0,1,9.2,0,Approved,2025-01-18
APP2026000159,LPG Subsidy,Uttar Pradesh,Prayagraj,59,Male,52360,5,Self-Employed,0,0,0,0,0,1,0,1,4.7,0,Approved,2025-11-18
APP2026000160,PM-KISAN,Uttar Pradesh,Prayagraj,21,Female,112752,4,Daily Wage,0,0,0,0,0,0,0,1,1.7,0,Approved,2026-06-17
APP2026000161,LPG Subsidy,Tamil Nadu,Erode,37,Female,112844,8,Unemployed,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-02-07
APP2026000162,Education Scholarship,Rajasthan,Kota,59,Female,85563,7,Unemployed,0,0,0,0,0,1,0,1,0.7,0,Under Review,2025-03-18
APP2026000163,Widow Pension,Karnataka,Kalaburagi,69,Female,111223,8,Self-Employed,0,0,0,0,0,0,0,1,3.6,0,Under Review,2025-05-05
APP2026000164,Widow Pension,Tamil Nadu,Coimbatore,54,Male,144869,3,Daily Wage,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-04-12
APP2026000165,Student Financial Assistance,Telangana,Nizamabad,27,Female,83495,6,Self-Employed,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-09-09
APP2026000166,Education Scholarship,Kerala,Thiruvananthapuram,57,Male,62939,6,Self-Employed,0,1,0,0,0,0,0,1,8.1,0,Approved,2026-02-10
APP2026000167,Education Scholarship,West Bengal,Kolkata,20,Female,166802,3,Farmer,0,0,0,0,0,0,0,1,2.1,0,Pending,2025-06-19
APP2026000168,LPG Subsidy,Uttar Pradesh,Agra,31,Female,110472,3,Daily Wage,0,1,0,0,0,1,0,1,12.3,0,Under Review,2025-06-02
APP2026000169,Housing Assistance,Karnataka,Bengaluru Urban,25,Male,126231,6,Unemployed,0,0,0,0,0,0,0,1,0.0,0,Under Review,2025-05-04
APP2026000170,Education Scholarship,Gujarat,Vadodara,75,Male,139316,2,Farmer,0,0,0,0,0,0,0,1,0.0,0,Pending,2026-06-03
APP2026000171,Education Scholarship,Karnataka,Hubballi-Dharwad,39,Male,100607,4,Student,0,0,0,0,0,0,0,1,0.0,0,Approved,2026-04-05
APP2026000172,Disability Pension,Telangana,Karimnagar,50,Male,69523,6,Farmer,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-10-17
APP2026000173,Disability Pension,Karnataka,Hubballi-Dharwad,63,Male,56666,7,Student,0,0,0,0,1,0,0,1,3.7,0,Approved,2025-01-29
APP2026000174,PMFBY,Rajasthan,Kota,74,Female,84223,5,Self-Employed,0,0,0,0,0,0,0,1,2.6,0,Pending,2025-03-03
APP2026000175,Education Scholarship,Tamil Nadu,Tiruppur,75,Male,129169,6,Student,0,0,0,0,0,0,0,1,2.4,0,Approved,2026-04-26
APP2026000176,LPG Subsidy,Tamil Nadu,Sivaganga,27,Female,133769,7,Self-Employed,0,0,0,0,0,0,0,1,0.0,0,Approved,2026-04-17
APP2026000177,PMFBY,Andhra Pradesh,Guntur,40,Female,100257,2,Salaried,0,0,0,0,0,0,0,1,0.3,0,Under Review,2026-02-23
APP2026000178,PMFBY,Gujarat,Ahmedabad,41,Male,117208,6,Farmer,0,0,0,0,0,0,0,1,0.0,0,Approved,2026-08-03
APP2026000179,PMFBY,Rajasthan,Jaipur,64,Male,39304,6,Salaried,0,0,0,0,0,1,0,1,8.0,1,Pending,2026-05-19
APP2026000180,Widow Pension,Uttar Pradesh,Varanasi,37,Male,63529,7,Salaried,0,0,0,0,1,0,0,1,3.9,0,Approved,2026-01-25
APP2026000181,Farmer Welfare,Rajasthan,Kota,31,Male,148857,5,Daily Wage,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-02-22
APP2026000182,Education Scholarship,Rajasthan,Kota,61,Male,48169,2,Student,0,0,0,0,0,0,1,1,8.0,0,Approved,2026-03-16
APP2026000183,PMFBY,Telangana,Karimnagar,46,Male,100060,1,Unemployed,0,0,1,0,0,0,0,1,6.3,0,Approved,2025-01-15
APP2026000184,Housing Assistance,Karnataka,Bengaluru Urban,61,Male,93549,5,Student,0,0,1,0,0,0,0,1,0.6,0,Approved,2026-01-11
APP2026000185,Disability Pension,Uttar Pradesh,Lucknow,40,Female,82633,3,Farmer,1,0,1,0,1,0,0,1,18.1,1,Pending,2025-07-08
APP2026000186,Old Age Pension,Maharashtra,Mumbai,46,Female,149741,3,Farmer,0,1,0,0,0,0,0,1,5.4,0,Approved,2025-01-21
APP2026000187,Housing Assistance,Kerala,Kozhikode,18,Male,106719,4,Unemployed,0,0,0,1,0,0,0,1,2.3,0,Approved,2026-08-17
APP2026000188,LPG Subsidy,Tamil Nadu,Tiruchirappalli,18,Female,36661,6,Farmer,0,0,0,0,0,0,0,1,0.0,0,Pending,2025-03-10
APP2026000189,Widow Pension,Uttar Pradesh,Lucknow,18,Female,132546,3,Self-Employed,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-11-01
APP2026000190,Widow Pension,Karnataka,Kalaburagi,28,Male,61527,5,Daily Wage,0,0,0,0,1,1,0,1,13.4,0,Approved,2025-03-19
APP2026000191,PMFBY,Rajasthan,Jodhpur,38,Male,32359,4,Self-Employed,0,0,0,0,0,1,0,1,8.1,0,Approved,2026-04-30
APP2026000192,Student Financial Assistance,Karnataka,Belagavi,20,Male,157040,1,Daily Wage,0,0,0,0,1,0,1,1,15.1,0,Pending,2025-04-10
APP2026000193,Student Financial Assistance,Tamil Nadu,Sivaganga,27,Male,36982,6,Student,0,0,0,0,0,0,0,1,0.6,0,Approved,2025-07-16
APP2026000194,LPG Subsidy,West Bengal,Kolkata,67,Female,68979,5,Daily Wage,0,0,0,0,0,0,0,1,0.0,0,Under Review,2025-03-13
APP2026000195,Student Financial Assistance,Tamil Nadu,Sivaganga,67,Female,112161,2,Farmer,0,0,0,0,0,0,0,1,1.4,0,Approved,2025-04-11
APP2026000196,Housing Assistance,Tamil Nadu,Tiruppur,34,Female,85186,6,Student,0,0,0,0,0,0,0,1,0.8,0,Under Review,2025-09-30
APP2026000197,Housing Assistance,Maharashtra,Aurangabad,72,Male,56351,1,Farmer,0,0,0,0,0,0,0,1,0.0,0,Pending,2025-03-11
APP2026000198,Disability Pension,West Bengal,Kolkata,24,Female,42714,3,Self-Employed,1,0,0,0,0,0,0,1,8.8,0,Approved,2025-08-15
APP2026000199,PM-KISAN,Tamil Nadu,Erode,19,Male,50894,2,Farmer,0,0,0,0,0,0,0,1,0.4,0,Pending,2026-07-17
APP2026000200,Old Age Pension,Karnataka,Mysuru,38,Male,40114,6,Self-Employed,0,0,0,0,0,0,0,0,10.5,0,Under Review,2025-11-28
APP2026000201,Old Age Pension,Uttar Pradesh,Varanasi,33,Male,81855,8,Farmer,0,0,0,0,0,0,0,1,0.0,0,Approved,2026-04-12
APP2026000202,Housing Assistance,Gujarat,Rajkot,22,Female,59787,7,Student,0,0,0,0,1,0,0,1,5.6,0,Approved,2025-05-30
APP2026000203,Old Age Pension,Telangana,Karimnagar,67,Female,32000,2,Farmer,0,0,0,0,0,0,0,1,0.0,0,Pending,2026-07-28
APP2026000204,Education Scholarship,Tamil Nadu,Sivaganga,74,Female,72450,1,Self-Employed,0,0,0,0,1,1,0,1,6.7,0,Pending,2026-05-11
APP2026000205,Farmer Welfare,Tamil Nadu,Erode,33,Female,55556,7,Salaried,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-09-28
APP2026000206,LPG Subsidy,Karnataka,Kalaburagi,36,Male,110045,5,Student,0,0,0,0,1,0,0,1,9.7,0,Approved,2025-02-10
APP2026000207,Widow Pension,Tamil Nadu,Tiruppur,59,Male,118084,3,Daily Wage,0,0,0,0,0,0,0,1,0.0,0,Under Review,2026-06-08
APP2026000208,PM-KISAN,Maharashtra,Aurangabad,72,Female,246235,8,Self-Employed,0,0,0,0,1,1,0,1,10.7,0,Approved,2025-02-11
APP2026000209,Housing Assistance,Tamil Nadu,Sivaganga,34,Female,146298,2,Farmer,0,0,0,0,0,0,0,1,2.0,0,Approved,2026-08-05
APP2026001565,PM-KISAN,Uttar Pradesh,Varanasi,24,Female,47907,5,Daily Wage,0,0,0,0,0,0,0,1,0.0,0,Approved,2025-03-25"""

def generate_csv_and_json():
    os.makedirs("backend/data", exist_ok=True)
    os.makedirs("src/data", exist_ok=True)
    
    # Save CSV
    csv_path = "backend/data/applications_dataset.csv"
    with open(csv_path, "w", encoding="utf-8") as f:
        f.write(DATASET_TEXT.strip())
    print(f"Written CSV dataset to {csv_path}")

if __name__ == "__main__":
    generate_csv_and_json()
