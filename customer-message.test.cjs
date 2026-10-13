const fs=require('fs'),assert=require('assert/strict');
const data=JSON.parse(fs.readFileSync('customer-i18n.json','utf8'));
for(const lang of ['tr','en','es','ru','ar']){
  assert.ok(data[lang].requestReceived,'Request receipt heading missing in '+lang);
  assert.ok(data[lang].notificationQuestion,'Notification question missing in '+lang);
  assert.ok(data[lang].arrivalEstimate.includes('20–25'),'Arrival estimate missing in '+lang);
}
assert.ok(data.tr.arrivalEstimate.includes('bulunması hâlinde'));
assert.ok(fs.readFileSync('customer-ui.js','utf8').includes("tr('arrivalEstimate')"));
console.log('PASS: received message, notification choice and conditional arrival estimate in five languages.');
