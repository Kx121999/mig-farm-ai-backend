import assert from "node:assert/strict";
import {
  sanitizeKnowledgeDocument, validateKnowledgeDocument, saveKnowledgeDocument,
  getKnowledgeDocument, answerAdminKnowledge, listKnowledgeVersions,
  rollbackKnowledgeDocument
} from "../lib/admin_knowledge.js";

const clean=sanitizeKnowledgeDocument({
  entries:[{
    type:"faq",title:"الشحن للعين",question:"عندكم شحن للعين؟",
    answer:"نعم، نوصل داخل الإمارات.",keywords:["شحن","العين"],
    locale:"ar",enabled:true,priority:20,verified:true,source_label:"MIG FARM"
  }]
});
assert.equal(clean.entries.length,1);

const validation=validateKnowledgeDocument(clean);
assert.equal(validation.ok,true);

const unsafe=validateKnowledgeDocument({entries:[{
  type:"fact",title:"جرعة مبيد",answer:"اخلط جرعة 50 مل",keywords:["جرعة"],enabled:true
}]});
assert.equal(unsafe.ok,false);
assert.ok(unsafe.errors.some(x=>x.includes("safety_approved")));

const dynamic=validateKnowledgeDocument({entries:[{
  type:"fact",title:"سعر الشحن",answer:"الشحن 13 درهم",keywords:["شحن"],enabled:true
}]});
assert.ok(dynamic.warnings.length>=1);

const saved1=await saveKnowledgeDocument(clean,{updated_by:"test"});
assert.equal(saved1.saved,true);
const doc1=await getKnowledgeDocument({force:true});
assert.ok(doc1.revision>=1);

const answer=await answerAdminKnowledge("هل عندكم توصيل للعين؟",{locale:"ar"});
assert.ok(answer);
assert.match(answer.reply,/نوصل داخل الإمارات/);
assert.equal(answer.entries[0].verified,true);

const saved2=await saveKnowledgeDocument({
  ...doc1,
  entries:[...doc1.entries,{
    type:"service",title:"البيوت المحمية",question:"تسوون بيوت محمية؟",
    answer:"نعم، نوفر خدمات البيوت المحمية.",keywords:["بيت محمي","جرين هاوس"],
    enabled:true,verified:true,source_label:"MIG FARM"
  }]
},{updated_by:"test2"});
assert.equal(saved2.saved,true);

const versions=await listKnowledgeVersions(5);
assert.ok(versions.length>=1);
const rollback=await rollbackKnowledgeDocument(versions[0].revision,{updated_by:"rollback-test"});
assert.equal(rollback.saved,true);

console.log("MIG FARM V8 Phase 3 Knowledge Admin tests passed");
