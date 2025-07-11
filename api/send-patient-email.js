const emailService = require('./email-service');
const { createClient } = require('@supabase/supabase-js');
const PDFDocument = require('pdfkit');
const getStream = require('get-stream');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');

// Load milestones data once
let milestonesData = null;
try {
  const milestonesPath = path.join(__dirname, '../src/data/milestones.json');
  milestonesData = JSON.parse(fs.readFileSync(milestonesPath, 'utf8'));
} catch (e) {
  // console.error('Could not load milestones.json:', e);
  milestonesData = { milestones: [] };
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchPatientReport(patientId) {
  // Fetch all patient data (similar to generatePatientReport)
  const [
    { data: patient },
    { data: visitNotes },
    { data: vaccinationRecords }
  ] = await Promise.all([
    supabase.from('patients').select('*').eq('id', patientId).single(),
    supabase.from('visit_notes').select('*, doctor:users!visit_notes_user_id_fkey(id, full_name), visit_notes_vitals (*)').eq('patient_id', patientId),
    supabase.from('vaccinations').select('*').eq('patient_id', patientId)
  ]);

  // Fetch clinic info
  let clinic = null;
  if (patient && patient.clinic_id) {
    const { data: clinicData } = await supabase
      .from('clinics')
      .select('id, name')
      .eq('id', patient.clinic_id)
      .single();
    clinic = clinicData;
  }

  return { patient, visitNotes, vaccinationRecords, clinic };
}

// Helper to calculate dynamic height for a block of text
function getTextBlockHeight(doc, text, options) {
  return doc.heightOfString(text, options);
}

// Color palette for modern design
const colors = {
  primary: '#2563eb',
  secondary: '#0f172a',
  accent: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  light: '#f8fafc',
  medium: '#64748b',
  dark: '#1e293b',
  cardBg: '#ffffff',
  headerBg: '#1e40af',
  gradient1: '#3b82f6',
  gradient2: '#06b6d4'
};

function drawHeader(doc, clinic, patient) {
  const pageWidth = doc.page.width;
  const headerHeight = 100;
  
  // Gradient background
  const gradient = doc.linearGradient(0, 0, pageWidth, headerHeight);
  gradient.stop(0, colors.gradient1);
  gradient.stop(1, colors.gradient2);
  doc.rect(0, 0, pageWidth, headerHeight).fill(gradient);
  
  // Curved bottom effect (simplified)
  doc.save();
  doc.rect(0, headerHeight - 10, pageWidth, 10).fill(gradient);
  doc.restore();
  
  // Clinic name
  doc.fontSize(28).fillColor('white').font('Helvetica-Bold');
  const clinicName = clinic?.name || 'Medical Center';
  doc.text(clinicName, 40, 25, { align: 'center' });
  
  // Subtitle
  doc.fontSize(14).fillColor('#e2e8f0').font('Helvetica');
  doc.text('Patient Medical Report', 40, 55, { align: 'center' });
  
  // Patient name in header
  doc.fontSize(16).fillColor('white').font('Helvetica-Bold');
  doc.text(`${patient.name || 'Patient Report'}`, 40, 75, { align: 'center' });
  
  doc.y = headerHeight + 30;
}

function drawPatientCard(doc, patient, clinic, x = 40, y = doc.y, width = 515, margin = 40) {
  // Validate and ensure all parameters are valid numbers
  x = Number(x) || 40;
  y = Number(y) || doc.y;
  width = Number(width) || 515;
  margin = Number(margin) || 40;
  
  const cardHeight = 200;
  const cardPadding = 25;
  const avatarSize = 80;
  
  // Check for page break
  if (doc.y + cardHeight > doc.page.height - margin) {
    doc.addPage();
    drawHeader(doc, clinic, patient);
    y = doc.y;
  }
  
  // Ensure y is a valid number
  y = Number(y) || doc.y;
  if (isNaN(y)) y = doc.y;
  
  // Card shadow effect
  doc.save();
  doc.rect(x + 3, y + 3, width, cardHeight).fill('#e2e8f0').opacity(0.3);
  doc.restore();
  
  // Main card background
  doc.save();
  doc.roundedRect(x, y, width, cardHeight, 15).fill(colors.cardBg).stroke('#e2e8f0');
  doc.restore();
  
  // Header section with accent color
  doc.save();
  doc.roundedRect(x, y, width, 50, 15).fill(colors.accent).clip();
  doc.rect(x, y + 35, width, 15).fill(colors.accent);
  doc.restore();
  
  // Patient info header
  doc.fontSize(16).fillColor('white').font('Helvetica-Bold');
  doc.text('Patient Information', x + cardPadding, y + 18);
  
  // Avatar with gradient
  const avatarX = x + cardPadding;
  const avatarY = y + 65;
  
  const avatarGradient = doc.radialGradient(avatarX + avatarSize/2, avatarY + avatarSize/2, 0, avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2);
  avatarGradient.stop(0, colors.primary);
  avatarGradient.stop(1, colors.accent);
  
  doc.save();
  doc.circle(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2).fill(avatarGradient);
  doc.restore();
  
  // Patient initials
  const initials = patient.name ? patient.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'P';
  doc.fillColor('white').fontSize(28).font('Helvetica-Bold');
  doc.text(initials, avatarX, avatarY + 20, { width: avatarSize, align: 'center' });
  
  // Patient details - Left column
  const infoX = avatarX + avatarSize + 30;
  const infoY = avatarY;
  const lineHeight = 22;
  
  doc.fontSize(18).fillColor(colors.dark).font('Helvetica-Bold');
  doc.text(patient.name || 'N/A', infoX, infoY);
  
  doc.fontSize(12).fillColor(colors.medium).font('Helvetica');
  doc.text(`Age: ${calculateAge(patient.dob)}`, infoX, infoY + lineHeight);
  doc.text(`Gender: ${patient.gender || 'N/A'}`, infoX, infoY + lineHeight * 2);
  doc.text(`Blood Group: ${patient.blood_group || 'N/A'}`, infoX, infoY + lineHeight * 3);
  doc.text(`DOB: ${formatDate(patient.dob)}`, infoX, infoY + lineHeight * 4);
  
  // Right column - Contact info
  const contactX = x + width - 200;
  const contactY = avatarY;
  
  doc.fontSize(12).fillColor(colors.medium).font('Helvetica-Bold');
  doc.text('Guardian Information', contactX, contactY);
  
  doc.fontSize(11).fillColor(colors.dark).font('Helvetica');
  doc.text(`Name: ${patient.guardian_name || 'N/A'}`, contactX, contactY + lineHeight);
  doc.text(`Phone: ${patient.guardian_phone || 'N/A'}`, contactX, contactY + lineHeight * 2);
  doc.text(`Email: ${patient.guardian_email || 'N/A'}`, contactX, contactY + lineHeight * 3, { width: 180 });
  
  // Additional info section
  if (patient.address) {
    doc.fontSize(11).fillColor(colors.medium).font('Helvetica');
    doc.text(`Address: ${patient.address}`, contactX, contactY + lineHeight * 4, { width: 180 });
  }
  
  doc.y = y + cardHeight + 25;
}

function drawVisitNoteCard(doc, note, patient, clinic, index, x = 40, y = doc.y, width = 515, margin = 40) {
  // Validate and ensure all parameters are valid numbers
  x = Number(x) || 40;
  y = Number(y) || doc.y;
  width = Number(width) || 515;
  margin = Number(margin) || 40;
  
  let cardHeight = 200;
  
  // Calculate dynamic height based on content
  const fields = [note.chief_complaint, note.development_status, note.diagnosis, note.treatment_plan, note.ai_response];
  let extraLines = 0;
  fields.forEach(field => {
    if (field && typeof field === 'string') {
      extraLines += Math.ceil(field.length / 60);
    }
  });
  cardHeight += extraLines * 15;
  
  // Ensure cardHeight is a valid number
  cardHeight = Number(cardHeight) || 200;
  if (isNaN(cardHeight)) cardHeight = 200;
  
  // Check for page break
  if (doc.y + cardHeight > doc.page.height - margin) {
    doc.addPage();
    drawHeader(doc, clinic, patient);
    y = doc.y;
  }
  
  // Ensure y is a valid number
  y = Number(y) || doc.y;
  if (isNaN(y)) y = doc.y;
  
  // Card shadow
  doc.save();
  doc.rect(x + 2, y + 2, width, cardHeight).fill('#e2e8f0').opacity(0.2);
  doc.restore();
  
  // Main card
  doc.save();
  doc.roundedRect(x, y, width, cardHeight, 12).fill(colors.cardBg).stroke('#d1d5db');
  doc.restore();
  
  // Header with visit number
  const headerHeight = 45;
  doc.save();
  doc.roundedRect(x, y, width, headerHeight, 12).fill(colors.primary).clip();
  doc.rect(x, y + 30, width, 15).fill(colors.primary);
  doc.restore();
  
  // Visit number badge
  const badgeX = x + width - 100;
  const badgeY = y + 12;
  doc.save();
  doc.roundedRect(badgeX, badgeY, 80, 22, 11).fill('white').opacity(0.2);
  doc.restore();
  
  doc.fontSize(12).fillColor('white').font('Helvetica-Bold');
  doc.text(`Visit #${index + 1}`, badgeX + 5, badgeY + 6);
  
  // Visit type and date
  doc.fontSize(16).fillColor('white').font('Helvetica-Bold');
  doc.text(note.visit_type || 'General Visit', x + 20, y + 15);
  
  doc.fontSize(11).fillColor('#e2e8f0').font('Helvetica');
  doc.text(`${formatDate(note.visit_date)}`, x + 20, y + 30);
  
  // Doctor info
  const doctorName = note.doctor_name || (note.doctor && note.doctor.full_name) || 'N/A';
  doc.text(`Dr. ${doctorName}`, x + 300, y + 30);
  
  // Content area
  let contentY = y + headerHeight + 20;
  const contentX = x + 20;
  const lineHeight = 18;
  
  // Chief Complaint
  if (note.chief_complaint) {
    doc.fontSize(12).fillColor(colors.primary).font('Helvetica-Bold');
    doc.text('Chief Complaint', contentX, contentY);
    
    doc.fontSize(11).fillColor(colors.dark).font('Helvetica');
    const complaintHeight = doc.heightOfString(note.chief_complaint, { width: width - 40 });
    doc.text(note.chief_complaint, contentX, contentY + 15, { width: width - 40 });
    contentY += complaintHeight + 25;
  }
  
  // Development Status
  if (note.development_status) {
    doc.fontSize(12).fillColor(colors.primary).font('Helvetica-Bold');
    doc.text('Development Status', contentX, contentY);
    
    const devText = `${note.development_status}${note.development_status === 'Delay' && note.development_delay_details ? ' (' + note.development_delay_details + ')' : ''}`;
    doc.fontSize(11).fillColor(colors.dark).font('Helvetica');
    doc.text(devText, contentX, contentY + 15, { width: width - 40 });
    contentY += doc.heightOfString(devText, { width: width - 40 }) + 20;
  }
  
  // Physical Examination
  if (note.physical_exam) {
    doc.fontSize(12).fillColor(colors.primary).font('Helvetica-Bold');
    doc.text('Physical Examination', contentX, contentY);
    
    const pe = note.physical_exam;
    const patientName = patient.name?.split(' ')[0] || 'Patient';
    const peText = `${patientName} appears ${pe.general || 'normal'}. ENT: ${pe.ent || 'normal'}, Skin: ${pe.skin || 'normal'}, Abdomen: ${pe.abdomen || 'soft'}, Chest/Lungs: ${pe.chest_lungs || 'clear'}.`;
    
    doc.fontSize(11).fillColor(colors.dark).font('Helvetica');
    const peHeight = doc.heightOfString(peText, { width: width - 40 });
    doc.text(peText, contentX, contentY + 15, { width: width - 40 });
    contentY += peHeight + 20;
  }
  
  // Diagnosis with highlight
  if (note.diagnosis) {
    doc.fontSize(12).fillColor(colors.error).font('Helvetica-Bold');
    doc.text('Diagnosis', contentX, contentY);
    
    doc.fontSize(11).fillColor(colors.dark).font('Helvetica');
    const diagnosisHeight = doc.heightOfString(note.diagnosis, { width: width - 40 });
    doc.text(note.diagnosis, contentX, contentY + 15, { width: width - 40 });
    contentY += diagnosisHeight + 20;
  }
  
  // Treatment Plan
  if (note.treatment_plan) {
    doc.fontSize(12).fillColor(colors.success).font('Helvetica-Bold');
    doc.text('Treatment Plan', contentX, contentY);
    
    const tp = note.treatment_plan;
    let plan = `Advice: ${tp.advice || 'N/A'}\nMedications: ${tp.medications || 'N/A'}`;
    
    if (tp.vaccines_given) {
      plan += `\nVaccination: Given`;
      if (tp.vaccines_details) {
        plan += ` (${tp.vaccines_details})`;
      }
    }
    
    doc.fontSize(11).fillColor(colors.dark).font('Helvetica');
    const planHeight = doc.heightOfString(plan, { width: width - 40 });
    doc.text(plan, contentX, contentY + 15, { width: width - 40 });
    contentY += planHeight + 20;
  }
  
  // Vitals in a box
  if (note.visit_notes_vitals && note.visit_notes_vitals[0]) {
    const v = note.visit_notes_vitals[0];
    const vitalsHeight = 60;
    
    doc.save();
    doc.roundedRect(contentX, contentY, width - 40, vitalsHeight, 8).fill('#f0f9ff').stroke(colors.accent);
    doc.restore();
    
    doc.fontSize(12).fillColor(colors.accent).font('Helvetica-Bold');
    doc.text('Vital Signs', contentX + 15, contentY + 10);
    
    const vitals = [
      v.height && `Height: ${v.height}cm`,
      v.weight && `Weight: ${v.weight}kg`,
      v.temperature && `Temp: ${v.temperature}°F`,
      v.heart_rate && `HR: ${v.heart_rate}bpm`,
      v.blood_pressure && `BP: ${v.blood_pressure}`,
      v.head_circumference && `HC: ${v.head_circumference}cm`
    ].filter(Boolean);
    
    doc.fontSize(10).fillColor(colors.dark).font('Helvetica');
    let vitalX = contentX + 15;
    let vitalY = contentY + 30;
    
    vitals.forEach((vital, idx) => {
      doc.text(vital, vitalX, vitalY);
      vitalX += 120;
      if ((idx + 1) % 3 === 0) {
        vitalX = contentX + 15;
        vitalY += 15;
      }
    });
    
    contentY += vitalsHeight + 20;
  }
  
  // AI Response with special styling
  if (note.ai_response) {
    doc.fontSize(12).fillColor(colors.accent).font('Helvetica-Bold');
    doc.text('AI Assessment', contentX, contentY);
    
    doc.fontSize(11).fillColor('#374151').font('Helvetica-Oblique');
    const aiHeight = doc.heightOfString(note.ai_response, { width: width - 40 });
    doc.text(note.ai_response, contentX, contentY + 15, { width: width - 40 });
    contentY += aiHeight + 20;
  }
  
  // Follow-up date
  if (note.follow_up_date) {
    doc.fontSize(11).fillColor(colors.warning).font('Helvetica-Bold');
    doc.text(`Next Follow-up: ${formatDate(note.follow_up_date)}`, contentX, contentY);
  }
  
  // Developmental Milestones
  if (note.development_milestones && milestonesData && Array.isArray(milestonesData.milestones)) {
    const domains = ['cognitive', 'grossMotor', 'fineMotor', 'communicationSocial'];
    let milestoneSectionY = doc.y + 10;
    doc.fontSize(12).fillColor(colors.primary).font('Helvetica-Bold');
    doc.text('Developmental Milestones', x + 20, milestoneSectionY);
    milestoneSectionY += 20;
    domains.forEach(domain => {
      // Get all milestone keys for this domain
      const domainEntries = Object.entries(note.development_milestones).filter(([key]) => key.startsWith(domain));
      if (domainEntries.length === 0) return;
      // Get all possible labels for this domain
      const items = milestonesData.milestones.flatMap(mg => mg[domain] || []);
      doc.fontSize(11).fillColor(colors.medium).font('Helvetica-Bold');
      doc.text(domain.replace(/([A-Z])/g, ' $1'), x + 35, doc.y + 2);
      doc.moveDown(0.5);
      // Table header
      const labelColX = x + 60;
      const statusColX = x + 320;
      const commentColX = x + 390;
      const rowStartY = doc.y;
      doc.fontSize(9).fillColor(colors.medium).font('Helvetica-Bold');
      doc.text('Milestone', labelColX, rowStartY, { width: statusColX - labelColX - 5 });
      doc.text('Status', statusColX, rowStartY, { width: commentColX - statusColX - 5 });
      doc.text('Comment', commentColX, rowStartY, { width: width - (commentColX - x) - 20 });
      let yRow = rowStartY + 14;
      domainEntries.forEach(([key, value]) => {
        const idx = parseInt(key.split('-')[1], 10);
        const label = items[idx] || key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        // Calculate heights for each cell
        doc.fontSize(10).font('Helvetica');
        const labelHeight = doc.heightOfString(label, { width: statusColX - labelColX - 5 });
        doc.fontSize(10).font('Helvetica-Bold');
        const statusText = value.met ? 'Met' : 'Not met';
        const statusHeight = doc.heightOfString(statusText, { width: commentColX - statusColX - 5 });
        doc.fontSize(9).font('Helvetica-Oblique');
        const commentText = (!value.met && value.comment) ? value.comment : '';
        const commentHeight = doc.heightOfString(commentText, { width: width - (commentColX - x) - 20 });
        const rowHeight = Math.max(labelHeight, statusHeight, commentHeight, 14);
        // Status dot
        doc.save();
        doc.circle(x + 50, yRow + rowHeight / 2 - 2, 4).fill(value.met ? colors.success : colors.error);
        doc.restore();
        // Label
        doc.fontSize(10).fillColor(colors.dark).font('Helvetica');
        doc.text(label, labelColX, yRow, { width: statusColX - labelColX - 5 });
        // Status text
        doc.fontSize(10).fillColor(value.met ? colors.success : colors.error).font('Helvetica-Bold');
        doc.text(statusText, statusColX, yRow, { width: commentColX - statusColX - 5 });
        // Comment
        doc.fontSize(9).fillColor(colors.medium).font('Helvetica-Oblique');
        doc.text(commentText, commentColX, yRow, { width: width - (commentColX - x) - 20 });
        yRow += rowHeight + 2;
      });
      doc.y = yRow + 4;
    });
    doc.moveDown(1);
  }
  
  doc.y = y + cardHeight + 30;
}

// At the top of the file, add the IAP_SCHEDULE (if not already present)
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

// Add this helper function near the top (after IAP_SCHEDULE)
function calculateDueDate(ageRequirement, patientDOB) {
  if (!patientDOB) return '';
  const dob = new Date(patientDOB);
  let dueDate = new Date(dob);
  if (ageRequirement === 'BIRTH') {
    return dob.toISOString().split('T')[0];
  }
  const match = ageRequirement.match(/(\d+)\s*(mo|weeks|yrs)/);
  if (!match) return '';
  const [_, number, unit] = match;
  const num = parseInt(number);
  switch (unit) {
    case 'weeks':
      dueDate.setDate(dob.getDate() + (num * 7));
      break;
    case 'mo':
      dueDate.setMonth(dob.getMonth() + num);
      break;
    case 'yrs':
      dueDate.setFullYear(dob.getFullYear() + num);
      break;
    default:
      return '';
  }
  return dueDate.toISOString().split('T')[0];
}

// Helper to get record for a given age/vaccine
function getVaccinationRecord(records, age, vaccine) {
  return records.find(r => r.age_label === age && r.vaccine === vaccine) || {
    age_label: age,
    vaccine,
    due_date: '',
    given_date: '',
    lot_no: '',
    comment: '',
  };
}

function drawVaccinationSection(doc, records, clinic, patient, x = 40, y = doc.y, width = 515, margin = 40) {
  x = Number(x) || 40;
  y = Number(y) || doc.y;
  width = Number(width) || 515;
  margin = Number(margin) || 40;

  // Table column widths: Age, Vaccine, Due Date, Given Date, Lot/Comment
  const colWidths = [60, 110, 90, 90, 140];
  const rowHeight = 28;
  const headerHeight = 30;
  const tableW = width - 20;
  let tableY = y + 60;
  let tableX = x + 10;

  // Helper to draw table header
  function drawTableHeader(startY) {
    doc.save();
    doc.rect(tableX, startY, tableW, headerHeight).fill('#f3f4f6');
    doc.restore();
    const headers = ['Age', 'Vaccine', 'Due Date', 'Given Date', 'Lot/Comment'];
    let colX = tableX;
    doc.fontSize(11).fillColor('#374151').font('Helvetica-Bold');
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], colX + 6, startY + 8, { width: colWidths[i] - 12, align: 'left' });
      colX += colWidths[i];
    }
    colX = tableX;
    for (let i = 0; i < headers.length; i++) {
      doc.save();
      doc.rect(colX, startY, colWidths[i], headerHeight).lineWidth(1).stroke('#d1d5db');
      doc.restore();
      colX += colWidths[i];
    }
  }

  // Only draw card shadow and header for the section header area
  doc.save();
  doc.rect(x + 2, y + 2, width, 120).fill('#e2e8f0').opacity(0.2);
  doc.restore();
  doc.save();
  doc.roundedRect(x, y, width, 120, 12).fill(colors.cardBg).stroke('#d1d5db');
  doc.restore();
  doc.save();
  doc.roundedRect(x, y, width, 50, 12).fill(colors.success).clip();
  doc.rect(x, y + 35, width, 15).fill(colors.success);
  doc.restore();
  doc.save();
  doc.circle(x + 30, y + 25, 12).fill('white').opacity(0.3);
  doc.restore();
  doc.fontSize(16).fillColor('white').font('Helvetica-Bold');
  doc.text('Vaccination Records', x + 50, y + 18);

  // Start table after header
  let yRow = tableY;
  drawTableHeader(yRow);
  yRow += headerHeight;
  let rowIdx = 0;
  for (const group of IAP_SCHEDULE) {
    for (const vaccine of group.vaccines) {
      // Check if we need a new page
      if (yRow + rowHeight > doc.page.height - margin - 40) {
        doc.addPage();
        drawHeader(doc, clinic, patient);
        yRow = margin + 10;
        drawTableHeader(yRow);
        yRow += headerHeight;
      }
      const record = getVaccinationRecord(records, group.age, vaccine);
      // Calculate due date if missing
      let dueDate = record.due_date;
      if (!dueDate) {
        dueDate = calculateDueDate(group.age, patient.dob);
      }
      const bgColor = rowIdx % 2 === 0 ? '#ffffff' : '#f3f4f6';
      doc.save();
      doc.rect(tableX, yRow, tableW, rowHeight).fill(bgColor);
      doc.restore();
      // Draw cell borders
      let colX = tableX;
      for (let i = 0; i < colWidths.length; i++) {
        doc.save();
        doc.rect(colX, yRow, colWidths[i], rowHeight).lineWidth(1).stroke('#d1d5db');
        doc.restore();
        colX += colWidths[i];
      }
      // Draw cell text
      let cellX = tableX;
      // Age
      doc.fontSize(10).fillColor('#374151').font('Helvetica-Bold');
      doc.text(group.age, cellX + 6, yRow + 8, { width: colWidths[0] - 12, align: 'left' });
      cellX += colWidths[0];
      // Vaccine
      doc.fontSize(10).fillColor('#111827').font('Helvetica-Bold');
      doc.text(vaccine, cellX + 6, yRow + 8, { width: colWidths[1] - 12, align: 'left' });
      cellX += colWidths[1];
      // Due Date
      doc.fontSize(10).fillColor('#374151').font('Helvetica');
      doc.text(dueDate ? formatDate(dueDate) : '', cellX + 6, yRow + 8, { width: colWidths[2] - 12, align: 'left' });
      cellX += colWidths[2];
      // Given Date
      doc.fontSize(10).fillColor('#374151').font('Helvetica');
      doc.text(record.given_date ? formatDate(record.given_date) : '', cellX + 6, yRow + 8, { width: colWidths[3] - 12, align: 'left' });
      cellX += colWidths[3];
      // Lot/Comment
      const lotText = record.lot_no || (record.comment || '');
      doc.fontSize(9).fillColor('#6b7280').font('Helvetica-Oblique');
      doc.text(lotText, cellX + 6, yRow + 8, { width: colWidths[4] - 12, align: 'left' });
      yRow += rowHeight;
      rowIdx++;
    }
  }
  doc.y = yRow + 30;
}

function formatDate(dateStr) {
  return dateStr ? new Date(dateStr).toLocaleDateString() : 'N/A';
}

function calculateAge(dobString) {
  if (!dobString) return 'N/A';
  
  try {
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return 'N/A';
    
    const today = new Date();
    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();
    
    if (today.getDate() < dob.getDate()) months--;
    if (months < 0) { 
      years--; 
      months += 12; 
    }
    
    // Ensure years and months are valid numbers
    if (isNaN(years) || isNaN(months)) return 'N/A';
    
    if (years < 1) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    
    return `${years} year${years !== 1 ? 's' : ''}${months > 0 ? ` ${months} month${months !== 1 ? 's' : ''}` : ''}`;
  } catch (error) {
    // console.error('Error calculating age:', error);
    return 'N/A';
  }
}

function drawFooter(doc, pageNum, pageCount) {
  const footerY = doc.page.height - 50;
  const pageWidth = doc.page.width;
  
  doc.save();
  doc.rect(0, footerY, pageWidth, 50).fill(colors.dark);
  doc.restore();
  
  doc.fontSize(10).fillColor('white').font('Helvetica');
  doc.text('Generated by PediaCircle', 40, footerY + 15);
  doc.text(`Report generated on ${new Date().toLocaleDateString()}`, 40, footerY + 30);
  
  // Page number
  doc.text(`Page ${pageNum} of ${pageCount}`, pageWidth - 120, footerY + 22);
}

function generatePatientPDF({ patient, visitNotes, vaccinationRecords, clinic }, options = { notes: true, vaccination: true }) {
  const doc = new PDFDocument({ margin: 0, bufferPages: true });
  doc.info.Title = `Patient Report - ${patient.name}`;
  
  // Draw header on first page
  drawHeader(doc, clinic, patient);
  
  // --- Patient Info Card ---
  drawPatientCard(doc, patient, clinic);
  
  // --- Visit Notes ---
  if (options.notes) {
    const reversedNotes = [...visitNotes].reverse();
    reversedNotes.forEach((note, idx) => {
      // Check if we need a new page and add header
      if (doc.y > doc.page.height - 200) {
        doc.addPage();
        drawHeader(doc, clinic, patient);
      }
      drawVisitNoteCard(doc, note, patient, clinic, idx);
    });
  }
  
  // --- Vaccination Section ---
  if (options.vaccination) {
    // Check if we need a new page and add header
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
      drawHeader(doc, clinic, patient);
    }
    drawVaccinationSection(doc, vaccinationRecords, clinic, patient);
  }
  
  // Add footer to all pages
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    drawFooter(doc, i + 1, pages.count);
  }
  
  doc.end();
  return doc;
}

// Utility to convert a stream to a buffer
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { patientId, email, subject, emailOption } = req.body;
  if (!patientId || !email || !subject || !emailOption) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Test PDFKit functionality first
    try {
      // console.log('Testing PDFKit functionality...');
      const testDoc = new PDFDocument();
      testDoc.text('Test PDF');
      testDoc.end();
      const testBuffer = await streamToBuffer(testDoc);
      // console.log('PDFKit test successful, buffer size:', testBuffer.length);
    } catch (pdfTestError) {
      // console.error('PDFKit test failed:', pdfTestError);
      return res.status(500).json({ 
        error: 'PDFKit library issue', 
        details: pdfTestError.message 
      });
    }

    // Optionally, verify patient exists and email matches guardian_email
    const { data: patient, error } = await supabase
      .from('patients')
      .select('id, guardian_email, name')
      .eq('id', patientId)
      .single();
    if (error || !patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (patient.guardian_email !== email) {
      return res.status(400).json({ error: 'Email does not match patient record' });
    }

    // Fetch all patient data
    const reportData = await fetchPatientReport(patientId);
    // Determine what to include
    const options = {
      notes: emailOption === 'notes' || emailOption === 'both',
      vaccination: emailOption === 'vaccination' || emailOption === 'both'
    };
    // Generate PDF
    let pdfBuffer;
    try {
      // console.log('Starting PDF generation for patient:', patient.name);
      // console.log('Patient ID:', patient.id);
      // console.log('Visit notes count:', reportData.visitNotes?.length || 0);
      // console.log('Vaccination count:', reportData.vaccinationRecords?.length || 0);
      // console.log('Clinic:', reportData.clinic?.name || 'N/A');
      
      // Validate required data
      if (!reportData.patient) {
        throw new Error('Patient data is missing');
      }
      
      if (!reportData.visitNotes) {
        // console.log('No visit notes found, setting to empty array');
        reportData.visitNotes = [];
      }
      
      if (!reportData.vaccinationRecords) {
        // console.log('No vaccination records found, setting to empty array');
        reportData.vaccinationRecords = [];
      }
      
      // console.log('Creating PDF document...');
      const pdfDoc = generatePatientPDF(reportData, options);
      
      // console.log('Converting PDF to buffer...');
      pdfBuffer = await streamToBuffer(pdfDoc);
      
      // console.log('PDF generated successfully, buffer size:', pdfBuffer.length);
      
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Generated PDF buffer is empty');
      }
      
    } catch (err) {
      // console.error('PDF generation error:', err);
      // console.error('Error message:', err.message);
      // console.error('Error stack:', err.stack);
      
      // Check if it's a dependency issue
      if (err.message.includes('PDFDocument') || err.message.includes('require')) {
        // console.error('Possible PDFKit dependency issue. Please check if pdfkit is installed.');
      }
      
      return res.status(500).json({ 
        error: 'PDF generation failed', 
        details: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }

    // Send email with PDF attachment
    // console.log('Sending email to:', email, 'with subject:', subject);
    const emailBody = `Hi,\n\nHere is your report. Please find the attached PDF.\n\nRegards,\nPediaCircle Team`;
    const result = await emailService.sendEmail(
      email,
      subject,
      emailBody,
      [
        {
          content: pdfBuffer.toString('base64'),
          filename: `Patient_Report_${patient.name.replace(/ /g, '_')}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
        }
      ]
    );
    if (!result.success) {
      // console.error('Failed to send email:', result.error);
      return res.status(500).json({ error: result.error || 'Failed to send email' });
    }
    // console.log('Email sent successfully to:', email);
    return res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}; 