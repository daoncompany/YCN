var HEADERS = ['제목', '내용', '작성일', '작성자', '팝업', '시작일', '종료일', '이미지', '첨부'];

function setupSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function doPost(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var body = JSON.parse(e.postData.contents);

    if (body.password !== props.getProperty('PASSWORD')) {
      return json({ ok: false, error: '암호가 올바르지 않습니다.' });
    }
    if (!String(body.제목 || '').trim() || !String(body.내용 || '').trim()) {
      return json({ ok: false, error: '제목과 내용은 필수입니다.' });
    }

    var folder = DriveApp.getFolderById(props.getProperty('FOLDER_ID'));
    var images = saveAll(body.images, folder);
    var files = saveAll(body.files, folder);

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var row = {
      '제목': String(body.제목).trim(),
      '내용': String(body.내용),
      '작성일': body.작성일 || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd'),
      '작성자': body.작성자 || 'YCN',
      '팝업': body.팝업 === 'Y' ? 'Y' : '',
      '시작일': body.시작일 || '',
      '종료일': body.종료일 || '',
      '이미지': images.join(' ; '),
      '첨부': files.join(' ; ')
    };
    var head = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    sheet.appendRow(head.map(function (h) { return row[String(h).trim()] || ''; }));

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function saveAll(items, folder) {
  if (!items || !items.length) return [];
  return items.map(function (f) {
    var blob = Utilities.newBlob(Utilities.base64Decode(f.data), f.type || 'application/octet-stream', f.name);
    var saved = folder.createFile(blob);
    saved.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return f.name + '|' + ('https://drive.google.com/uc?export=view&id=' + saved.getId());
  });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
