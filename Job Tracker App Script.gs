function formatReferralCell(sheet, row, col) {
  const cell = sheet.getRange(row, col);
  const value = String(cell.getValue() || '').trim();

  // Expected format:
  // Recruiters=https://...|Employees=https://...
  if (!value.includes('=') || !value.includes('|')) return;

  const parts = value.split('|');

  const links = parts.map(part => {
    const i = part.indexOf('=');

    if (i === -1) return null;

    const label = part.slice(0, i).trim();
    const url = part.slice(i + 1).trim();

    if (!label || !/^https?:\/\//i.test(url)) return null;

    return { label, url };
  });

  // If any part is invalid, leave the cell unchanged
  if (!links.length || links.some(x => !x)) return;

  const text = links.map(x => x.label).join('\n');

  const rich = SpreadsheetApp
    .newRichTextValue()
    .setText(text);

  let pos = 0;

  for (const link of links) {
    rich.setLinkUrl(
      pos,
      pos + link.label.length,
      link.url
    );

    pos += link.label.length + 1;
  }

  cell.setRichTextValue(rich.build());
}


// ============================================================
// EXISTING MANUAL EDIT LOGIC
// ============================================================

function onEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  const col = e.range.getColumn();

  // ==========================================================
  // P = Referral Lead
  // ==========================================================

  if (col === 16 && row > 1) {
    formatReferralCell(sheet, row, col);
  }

  // ==========================================================
  // S = Application Status
  // T = Applied Date
  // U = Follow-up Date
  // ==========================================================

  if (col === 19 && row > 1) {
    const status = e.range.getValue();

    const appliedDateCell =
      sheet.getRange(row, 20);

    const followUpDateCell =
      sheet.getRange(row, 21);

    if (status === "Applied") {

      const date = new Date();

      appliedDateCell.setValue(
        date.toDateString("d/m/yyyy")
      );

      followUpDateCell.clearContent();

    } else if (
      status === "Not Applied" ||
      status === "Job Expired" || 
      status === ""
    ) {

      appliedDateCell.clearContent();
      followUpDateCell.clearContent();

    } else {

      const date = new Date();

      if (appliedDateCell.getValue() == "") {
        appliedDateCell.setValue("9/9/2026");
      }

      followUpDateCell.setValue(
        date.toDateString("d/m/yyyy")
      );
    }
  }
}


// ============================================================
// MANUAL TEST FUNCTION
// ============================================================

function formatLastReferralCell() {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet()
      .getActiveSheet();

  const row = sheet.getLastRow();

  formatReferralCell(
    sheet,
    row,
    16
  );
}


// ============================================================
// API ENDPOINT FOR N8N
//
// n8n sends:
//
// {
//   "spreadsheetId": "...",
//   "sheetName": "Sheet1",
//   "applicationLink": "https://..."
// }
//
// The script finds that Application Link in column F
// and converts Referral Lead in column P.
// ============================================================

function doPost(e) {
  try {
    const data = JSON.parse(
      e.postData?.contents || '{}'
    );

    const spreadsheetId =
      String(data.spreadsheetId || '').trim();

    const sheetName =
      String(data.sheetName || '').trim();

    if (!spreadsheetId) {
      throw new Error('Missing spreadsheetId.');
    }

    if (!sheetName) {
      throw new Error('Missing sheetName.');
    }

    const ss =
      SpreadsheetApp.openById(spreadsheetId);

    const sheet =
      ss.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error(
        'Sheet not found: ' + sheetName
      );
    }

    // Get the newly appended row
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      throw new Error('No data row found.');
    }

    // P = Referral Lead
    formatReferralCell(
      sheet,
      lastRow,
      16
    );

    return ContentService
      .createTextOutput(
        JSON.stringify({
          success: true,
          row: lastRow
        })
      )
      .setMimeType(
        ContentService.MimeType.JSON
      );

  } catch (error) {

    return ContentService
      .createTextOutput(
        JSON.stringify({
          success: false,
          error: error.message
        })
      )
      .setMimeType(
        ContentService.MimeType.JSON
      );
  }
} 