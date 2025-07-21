const IAP_SCHEDULE = [
  { age: 'BIRTH', vaccines: ['BCG', 'OPV (0)', 'Hepatitis B (1)'] },
  { age: '6 weeks', vaccines: ['Hepatitis B (2)', 'DTPw / DTaP (1)', 'HIB (1)', 'IPV (1)', 'Pneumococcal - PCV (1)', 'Rotavirus (1)'] },
  { age: '10 weeks', vaccines: ['DTPw / DTaP (2)', 'HIB (2)', 'IPV (2)', 'Pneumococcal - PCV (2)', 'Rotavirus (2)'] },
  { age: '14 weeks', vaccines: ['DTPw / DTaP (3)', 'HIB (3)', 'IPV (3)', 'Pneumococcal - PCV (3)', 'Rotavirus (3)'] },
  { age: '6mo', vaccines: ['Hepatitis B (3) + OPV (1)'] },
  { age: '9 mo', vaccines: ['M.M.R. (1) + OPV (2)'] },
  { age: '12 mo', vaccines: ['Hepatitis A (1)'] },
  { age: '15 mo', vaccines: ['M.M.R. (2) + Varicella (1)', 'Pneumo. - PCV Booster'] },
  { age: '16-18 mo', vaccines: ['DTPw / DTaP (B1)', 'HIB (B1)', 'IPV (B1)'] },
  { age: '18 mo', vaccines: ['Hepatitis A (2)'] },
  { age: '2 yrs', vaccines: ['Typhoid (every 3 yrs)'] },
  { age: '4-6 yrs', vaccines: ['DTPw / DTaP (B2)+OPV(3)', 'Varicella (2)', 'Typhoid (2)'] },
  { age: '10-12 yrs', vaccines: ['Td / Tdap', 'HPV (0, 1-2 mo, 6 mo)'] },
];
module.exports = { IAP_SCHEDULE }; 