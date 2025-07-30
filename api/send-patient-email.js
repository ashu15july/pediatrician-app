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
    const tableColWidths = [180, 80, 200]; // Milestone, Status, Comment
    const tableRowHeight = 18;
    const tableHeaderHeight = 20;
    const tableMargin = 10;
    domains.forEach(domain => {
      // Only show milestones present in the visit note for this domain
      const domainEntries = Object.entries(note.development_milestones).filter(([key]) => key.startsWith(domain));
      if (domainEntries.length === 0) return;
      // Table header
      let yRow = doc.y + tableMargin;
      // Check for page break before drawing domain header
      if (yRow + tableHeaderHeight + tableRowHeight * domainEntries.length > doc.page.height - 60) {
        doc.addPage();
        drawHeader(doc, clinic, patient);
        yRow = 60;
      }
      doc.fontSize(11).fillColor(colors.medium).font('Helvetica-Bold');
      doc.text(domain.replace(/([A-Z])/g, ' $1'), x + 35, yRow);
      yRow += tableHeaderHeight;
      // Draw table header row
      doc.fontSize(9).fillColor(colors.medium).font('Helvetica-Bold');
      doc.rect(x + 60, yRow, tableColWidths[0], tableRowHeight).fill('#f3f4f6');
      doc.rect(x + 60 + tableColWidths[0], yRow, tableColWidths[1], tableRowHeight).fill('#f3f4f6');
      doc.rect(x + 60 + tableColWidths[0] + tableColWidths[1], yRow, tableColWidths[2], tableRowHeight).fill('#f3f4f6');
      doc.fillColor('#374151');
      doc.text('Milestone', x + 65, yRow + 4, { width: tableColWidths[0] - 10 });
      doc.text('Status', x + 65 + tableColWidths[0], yRow + 4, { width: tableColWidths[1] - 10 });
      doc.text('Comment', x + 65 + tableColWidths[0] + tableColWidths[1], yRow + 4, { width: tableColWidths[2] - 10 });
      yRow += tableRowHeight;
      // Draw each milestone row (only those present in visit note, both met and not met)
      domainEntries.forEach(([key, value], idx) => {
        // Check for page break before drawing each row
        if (yRow + tableRowHeight > doc.page.height - 60) {
          doc.addPage();
          drawHeader(doc, clinic, patient);
          yRow = 60;
        }
        // Try to get the label from milestonesData if possible
        let label = key;
        const match = key.match(/^(.*)-(\d+)$/);
        if (match) {
          const domainKey = match[1];
          const index = parseInt(match[2], 10);
          const items = milestonesData.milestones.flatMap(mg => mg[domainKey] || []);
          if (items[index]) label = items[index];
        }
        // Row background
        if (idx % 2 === 0) {
          doc.rect(x + 60, yRow, tableColWidths[0] + tableColWidths[1] + tableColWidths[2], tableRowHeight).fill('#ffffff');
        } else {
          doc.rect(x + 60, yRow, tableColWidths[0] + tableColWidths[1] + tableColWidths[2], tableRowHeight).fill('#f9fafb');
        }
        // Milestone label
        doc.fontSize(10).fillColor(colors.dark).font('Helvetica');
        doc.text(label, x + 65, yRow + 4, { width: tableColWidths[0] - 10 });
        // Status
        const statusText = value && typeof value.met !== 'undefined' ? (value.met ? 'Met' : 'Not met') : 'Met';
        doc.fontSize(10).fillColor(value && value.met ? colors.success : colors.error).font('Helvetica-Bold');
        doc.text(statusText, x + 65 + tableColWidths[0], yRow + 4, { width: tableColWidths[1] - 10 });
        // Comment
        doc.fontSize(9).fillColor(colors.medium).font('Helvetica-Oblique');
        doc.text(value && value.comment ? value.comment : '', x + 65 + tableColWidths[0] + tableColWidths[1], yRow + 4, { width: tableColWidths[2] - 10 });
        yRow += tableRowHeight;
      });
      doc.y = yRow + tableMargin;
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
  try {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { patientId, email, subject, emailOption } = req.body;
  if (!patientId || !email || !subject || !emailOption) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

    // Test PDFKit functionality first
    try {
      const testDoc = new PDFDocument();
      testDoc.text('Test PDF');
      testDoc.end();
      const testBuffer = await streamToBuffer(testDoc);
    } catch (pdfTestError) {
      return res.status(500).json({ 
        error: 'PDFKit library issue', 
        details: pdfTestError.message 
      });
    }

    // Optionally, verify patient exists and email matches guardian_email
    const { data: patient, error } = await supabase
      .from('patients')
      .select('id, guardian_email, name, dob, gender, blood_group, address')
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

    // Pick the latest visit note (or empty object if none)
    const visit = (reportData.visitNotes && reportData.visitNotes.length > 0) ? reportData.visitNotes[0] : {};
    let pdfBuffer;
    try {
      // Validate required data
      if (!reportData.patient) {
        throw new Error('Patient data is missing');
      }
      if (!reportData.visitNotes) {
        reportData.visitNotes = [];
      }
      if (!reportData.vaccinationRecords) {
        reportData.vaccinationRecords = [];
      }
      const pdfDoc = generatePatientPDF(reportData, options);
      pdfBuffer = await streamToBuffer(pdfDoc);
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Generated PDF buffer is empty');
      }
    } catch (err) {
      console.error('PDF generation failed:', err);
      return res.status(500).json({ 
        error: 'PDF generation failed', 
        details: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }

    // Generate a beautiful, concise HTML email body
    const clinicName = reportData.clinic?.name || 'Your Clinic';
    // Gender-based emoji and color
    let babyEmoji = '👶🏻';
    let babyBg = 'linear-gradient(135deg, #38bdf8 0%, #06b6d4 100%)'; // default blue/green
    if (patient.gender && typeof patient.gender === 'string') {
      const g = patient.gender.toLowerCase();
      if (g.startsWith('m')) { // male, boy
        babyEmoji = '👦🏻';
        babyBg = 'linear-gradient(135deg, #38bdf8 0%, #06b6d4 100%)'; // blue/green
      } else if (g.startsWith('f')) { // female, girl
        babyEmoji = '👧🏻';
        babyBg = 'linear-gradient(135deg, #f472b6 0%, #a78bfa 100%)'; // pink/purple
      } else {
        babyEmoji = '👶🏻';
        babyBg = 'linear-gradient(135deg, #a7f3d0 0%, #fef08a 100%)'; // mint/yellow
      }
    }
    const emojiCircleStyle = `width: 80px; height: 80px; background: ${babyBg}; border-radius: 50%; margin: 0 auto 16px; line-height: 80px; text-align: center; font-size: 44px; padding: 0; display: block;`;
    let html;
    if (emailOption === 'vaccination') {
      html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #38bdf8 0%, #06b6d4 100%); padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Vaccination Summary</h1>
            <p style="color: #e0f2fe; margin: 8px 0 0 0; font-size: 16px;">${clinicName}</p>
          </div>
          <!-- Content -->
          <div style="padding: 40px 32px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="${emojiCircleStyle}">${babyEmoji}</div>
              <h2 style="color: #1f2937; margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">${patient.name}</h2>
              <p style="color: #6b7280; margin: 0; font-size: 16px;">Vaccination summary is ready</p>
            </div>
            <!-- Message -->
            <div style="background: #f0f9ff; padding: 24px; border-radius: 12px; border: 1px solid #e0f2fe;">
              <h3 style="color: #0e7490; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">💉 Vaccination Report Attached</h3>
              <p style="color: #0e7490; margin: 0; font-size: 16px; line-height: 1.6;">
                Your complete vaccination summary has been generated and attached to this email.<br/>
                The PDF contains all vaccination records for the patient.
              </p>
            </div>
          </div>
          <!-- Footer -->
          <div style="background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              Generated by <strong style="color: #0ea5e9;">${clinicName}</strong> • 
              For questions, contact your doctor
            </p>
          </div>
        </div>
      </div>
      `;
    } else {
      html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Patient visit summary</h1>
            <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 16px;">${clinicName}</p>
          </div>
          <!-- Content -->
          <div style="padding: 40px 32px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="${emojiCircleStyle}">${babyEmoji}</div>
              <h2 style="color: #1f2937; margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">${patient.name}</h2>
              <p style="color: #6b7280; margin: 0; font-size: 16px;">Your visit summary is ready</p>
            </div>
            <!-- Message -->
            <div style="background: #f0f9ff; padding: 24px; border-radius: 12px; border: 1px solid #e0f2fe;">
              <h3 style="color: #0c4a6e; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">📋 Complete Report Attached</h3>
              <p style="color: #0c4a6e; margin: 0; font-size: 16px; line-height: 1.6;">
                Your complete visit summary has been generated and attached to this email. 
                The PDF contains detailed visit notes, vitals, treatment plans, and vaccination records if any.
              </p>
            </div>
          </div>
          <!-- Footer -->
          <div style="background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              Generated by <strong style="color: #2563eb;">PediaCircle</strong> • 
              For questions, contact your doctor
            </p>
          </div>
        </div>
      </div>
      `;
    }

    // Log environment variables used for email
    // console.log('SENDGRID_API_KEY set:', !!process.env.SENDGRID_API_KEY);
    // console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
    // console.log('SUPABASE_SERVICE_ROLE_KEY set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Log patient and visit data
    // console.log('Patient data:', JSON.stringify(patient, null, 2));
    // console.log('Visit data:', JSON.stringify(visit, null, 2));

    // Logging before sending email
    const emailPayload = {
      to: patient.guardian_email,
      subject: subject || 'Patient Visit Summary',
      html,
      attachments: [
        {
          content: pdfBuffer.toString('base64'),
          filename: `Patient_Report_${patient.name.replace(/ /g, '_')}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
        }
      ]
    };
    // console.log('Email payload:', JSON.stringify(emailPayload, null, 2));
    try {
      const result = await emailService.sendEmail(
        patient.guardian_email,
        subject || 'Patient Visit Summary',
        html,
        emailPayload.attachments
      );
      // console.log('Result from emailService.sendEmail:', result);
      if (result && result.success === false) {
        throw new Error(result.error || 'Unknown error from email service');
    }
      // console.log('Email sent successfully to:', patient.guardian_email);
    return res.status(200).json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
      console.error('Failed to send email:', error);
      return res.status(500).json({ error: 'Failed to send email', details: error.message });
    }
  } catch (err) {
    console.error('Top-level error in send-patient-email:', err);
    res.status(500).json({ error: 'A server error occurred', details: err.message });
  }
}