/**
 * YCN 공지사항 등록 엔드포인트
 *
 * [ 설치 ]
 * 1. 공지사항 구글 시트를 열고  확장 프로그램 > Apps Script  선택
 * 2. 이 파일 내용을 전부 붙여넣고 저장
 * 3. 좌측 톱니(프로젝트 설정) > 스크립트 속성 에서 아래 두 개를 추가
 *      PASSWORD    관리자 암호 (원하는 값으로)
 *      FOLDER_ID   첨부를 담을 구글 드라이브 폴더 ID
 *                  (폴더 주소 .../folders/여기부분)
 * 4. 편집기에서 setupSheet 함수를 한 번 실행해 머리글을 맞춘다
 * 5. 배포 > 새 배포 > 유형 '웹 앱'
 *      실행 사용자      : 나
 *      액세스 권한      : 모든 사용자
 *    → 발급된 /exec 주소를 js/admin.js 의 NOTICE_API 에 넣는다
 *
 * 코드를 고친 뒤에는 반드시 '배포 관리 > 편집 > 새 버전'으로 다시 배포해야 반영된다.
 */

var HEADERS = ['제목', '내용', '작성일', '작성자', '팝업', '시작일', '종료일', '이미지', '첨부'];

/** 시트 1행 머리글을 코드와 맞춘다. 최초 1회 실행. */
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
    // 머리글 순서가 바뀌어도 맞게 들어가도록 이름으로 맞춘다
    var head = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    sheet.appendRow(head.map(function (h) { return row[String(h).trim()] || ''; }));

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/** 첨부 저장 → "파일명|주소" 문자열 배열 */
function saveAll(items, folder) {
  if (!items || !items.length) return [];
  return items.map(function (f) {
    var blob = Utilities.newBlob(Utilities.base64Decode(f.data), f.type || 'application/octet-stream', f.name);
    var saved = folder.createFile(blob);
    // 방문자가 열 수 있어야 하므로 링크 공개. 공지 첨부 전용 폴더를 쓸 것.
    saved.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return f.name + '|' + ('https://drive.google.com/uc?export=view&id=' + saved.getId());
  });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
